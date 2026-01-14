# ClickHouse Schema

This document describes the ClickHouse schema used by the monitor app and the rationale behind the design.

## Tables & Columns

### `projects`

| Column       | Type     | Notes                      |
| ------------ | -------- | -------------------------- |
| `id`         | UUID     | Primary project identifier |
| `domain`     | String   | Authorized Hostname        |
| `name`       | String   | Display name               |
| `created_at` | DateTime | Creation timestamp         |
| `updated_at` | DateTime | Last update timestamp      |

Engine: `ReplacingMergeTree(updated_at)`  
Order key: `(id)`

### `cwv_events`

| Column         | Type                   | Notes                                      |
| -------------- | ---------------------- | ------------------------------------------ |
| `project_id`   | UUID                   | Owning project                             |
| `session_id`   | String                 | Client session identifier                  |
| `route`        | String                 | Normalized route                           |
| `path`         | String                 | Raw concrete path (e.g. `/blog/xyz`)       |
| `device_type`  | LowCardinality(String) | Device classification (`desktop`/`mobile`) |
| `metric_name`  | LowCardinality(String) | Metric name (LCP, FID, etc.)               |
| `metric_value` | Float64                | Metric value                               |
| `rating`       | LowCardinality(String) | Rating (good / needs_improvement / poor)   |
| `recorded_at`  | DateTime64(3, 'UTC')   | Client-side timestamp                      |
| `ingested_at`  | DateTime64(3, 'UTC')   | Server ingest timestamp                    |

Engine: `MergeTree`  
Partition key: `toYYYYMM(recorded_at)`  
Order key: `(project_id, route, metric_name, recorded_at, session_id)`  
TTL: `toDateTime(recorded_at) + INTERVAL 90 DAY DELETE`

### `custom_events`

| Column        | Type                   | Notes                                      |
| ------------- | ---------------------- | ------------------------------------------ |
| `project_id`  | UUID                   | Owning project                             |
| `session_id`  | String                 | Per-page-load session identifier           |
| `route`       | String                 | Normalized route                           |
| `path`        | String                 | Raw concrete path (e.g. `/blog/xyz`)       |
| `device_type` | LowCardinality(String) | Device classification (`desktop`/`mobile`) |
| `event_name`  | LowCardinality(String) | Custom event name (e.g. `purchase`)        |
| `recorded_at` | DateTime64(3, 'UTC')   | Client-side timestamp                      |
| `ingested_at` | DateTime64(3, 'UTC')   | Server ingest timestamp                    |

Engine: `MergeTree`  
Partition key: `toYYYYMM(recorded_at)`  
Order key: `(project_id, route, event_name, recorded_at, session_id)`  
TTL: `toDateTime(recorded_at) + INTERVAL 90 DAY DELETE`

### `cwv_daily_aggregates`

| Column        | Type                                                          | Notes                                      |
| ------------- | ------------------------------------------------------------- | ------------------------------------------ |
| `project_id`  | UUID                                                          | Owning project                             |
| `route`       | String                                                        | Normalized route                           |
| `device_type` | LowCardinality(String)                                        | Device classification (`desktop`/`mobile`) |
| `metric_name` | LowCardinality(String)                                        | Metric name                                |
| `event_date`  | Date                                                          | Calendar day of the event                  |
| `quantiles`   | AggregateFunction(quantiles(0.5,0.75,0.9,0.95,0.99), Float64) | Percentile state                           |
| `sample_size` | AggregateFunction(count, UInt64)                              | Count state                                |

Engine: `AggregatingMergeTree`  
Partition key: `toYYYYMM(event_date)`  
Order key: `(project_id, route, device_type, metric_name, event_date)`  
TTL: `event_date + INTERVAL 365 DAY DELETE`

### `mv_cwv_daily_aggregates`

Materialized view that reads from `cwv_events` and populates `cwv_daily_aggregates`:

```sql
SELECT
  project_id,
  route,
  device_type,
  metric_name,
  toDate(recorded_at) AS event_date,
  quantilesState(0.5, 0.75, 0.9, 0.95, 0.99)(metric_value) AS quantiles,
  countState() AS sample_size
FROM cwv_events
GROUP BY project_id, route, device_type, metric_name, event_date;
```

## Design Rationale

- **Multi-tenant first:** Every fact and aggregate row carries `project_id`, and it is part of the sort key. Queries should always include `WHERE project_id = ?`, which keeps tenant data well-isolated and efficient to scan.
- **Dimension tables as `ReplacingMergeTree`:** `projects` uses `ReplacingMergeTree` so we can upsert project rows cheaply by inserting new versions.
- **Events as `MergeTree`:** `cwv_events` is append-only and high-volume. Plain `MergeTree` gives fast writes and reads while supporting partitioning and TTL. The chosen order key reflects common filters: project, route, metric, and time.
- **Normalized route + raw path:** Each event stores both a logical `route` (e.g. `/blog/[slug]`) and the raw `path` (e.g. `/blog/xyz`). Aggregations typically group by `route`, while `path` is available for drill-down and debugging.
- **Time-based partitioning & TTL:** Partitions by `toYYYYMM(recorded_at)` and a 90-day TTL on raw events make automatic retention efficient. Older partitions can be dropped without heavy deletes. Aggregates are cheaper, so they use a 1-year TTL.
- **Pre-aggregated quantiles via `AggregatingMergeTree`:** Dashboard queries need daily percentiles by route and metric. Storing `quantilesState` and `countState` in `cwv_daily_aggregates` means we query a much smaller table and merge aggregate states instead of scanning all raw events.
- **LowCardinality for enums:** `metric_name` and `rating` have tiny cardinality, so `LowCardinality(String)` reduces storage and speeds up grouping and filtering for typical analytical queries.

## Better Auth Schema

The monitor app uses Better Auth for authentication. The following tables are created by `migrations/002_auth.sql`.

> Note: ClickHouse does not enforce relational constraints (e.g. foreign keys) or uniqueness constraints. Relationships like `session.user_id -> user.id` are application-level.

### Design notes (Better Auth in ClickHouse)

- **`ReplacingMergeTree(updated_at)`**: Better Auth requires upserts/updates. We use `ReplacingMergeTree(updated_at)` so the newest row “wins” when multiple versions share the same sort key. The adapter queries with `FINAL` to get the latest version deterministically.
- **Order keys chosen for hot lookups**:
  - **`session`**: `ORDER BY token` (session validation is typically “lookup by token”)
  - **`account`**: `ORDER BY (provider_id, account_id)` (OAuth/SSO lookup)
  - **`verification`**: `ORDER BY (identifier, value)` (OTP / magic link / reset token lookup)
- **TTL for expiring data**:
  - **`session`**: `TTL expires_at DELETE`
  - **`verification`**: `TTL expires_at DELETE`
    TTL runs asynchronously, so correctness still comes from checking `expires_at` in app logic; TTL is for automatic cleanup and storage control.
- **Skipping indexes (bloom filters)**: We add bloom filter indexes on a few high-cardinality lookup fields (e.g. `user.email`, `session.user_id`, `account.user_id`). These are **data-skipping indexes** (they help avoid reading parts) — they are not uniqueness constraints.
- **`LowCardinality(String)` for `account.provider_id`**: Provider identifiers tend to have tiny cardinality (e.g. `google`, `github`), so `LowCardinality` reduces storage and speeds up grouping/filtering.

### `user`

| Column                  | Type               | Notes                   |
| ----------------------- | ------------------ | ----------------------- |
| `id`                    | String             | Primary user identifier |
| `name`                  | String             | Display name            |
| `email`                 | String             | User email address      |
| `email_verified`        | Bool               | Defaults to `false`     |
| `role`                  | String             | Defaults to `'user'`    |
| `banned`                | Bool               | Defaults to `false`     |
| `is_password_temporary` | Bool               | Defaults to `false`     |
| `ban_reason`            | Nullable(String)   | Optional ban reason     |
| `ban_expires`           | Nullable(DateTime) | Optional ban expiration |
| `image`                 | Nullable(String)   | Optional avatar/image   |
| `created_at`            | DateTime           | Defaults to `now()`     |
| `updated_at`            | DateTime           | Defaults to `now()`     |

Engine: `ReplacingMergeTree(updated_at)`  
Order key: `(id)`  
Indexes: `idx_user_email` (bloom filter)

### `session`

| Column            | Type             | Notes                         |
| ----------------- | ---------------- | ----------------------------- |
| `id`              | String           | Primary session identifier    |
| `expires_at`      | DateTime         | Session expiration timestamp  |
| `token`           | String           | Session token                 |
| `created_at`      | DateTime         | Defaults to `now()`           |
| `updated_at`      | DateTime         | Defaults to `now()`           |
| `ip_address`      | Nullable(String) | Optional client IP address    |
| `user_agent`      | Nullable(String) | Optional client user agent    |
| `user_id`         | String           | Owning user (`user.id`)       |
| `impersonated_by` | Nullable(String) | Optional impersonator user id |

Engine: `ReplacingMergeTree(updated_at)`  
Order key: `(token)`  
TTL: `expires_at DELETE`  
Indexes: `idx_session_user_id` (bloom filter)

### `account`

| Column                     | Type                   | Notes                                  |
| -------------------------- | ---------------------- | -------------------------------------- |
| `id`                       | String                 | Primary account identifier             |
| `account_id`               | String                 | Provider account identifier            |
| `provider_id`              | LowCardinality(String) | Provider identifier (e.g. `google`)    |
| `user_id`                  | String                 | Owning user (`user.id`)                |
| `access_token`             | Nullable(String)       | Provider access token                  |
| `refresh_token`            | Nullable(String)       | Provider refresh token                 |
| `id_token`                 | Nullable(String)       | Provider ID token                      |
| `access_token_expires_at`  | Nullable(DateTime)     | Access token expiration                |
| `refresh_token_expires_at` | Nullable(DateTime)     | Refresh token expiration               |
| `password`                 | Nullable(String)       | Password hash (credentials-based auth) |
| `created_at`               | DateTime               | Defaults to `now()`                    |
| `updated_at`               | DateTime               | Defaults to `now()`                    |

Engine: `ReplacingMergeTree(updated_at)`  
Order key: `(provider_id, account_id)`  
Indexes: `idx_account_user_id` (bloom filter)

### `verification`

| Column       | Type     | Notes                                  |
| ------------ | -------- | -------------------------------------- |
| `id`         | String   | Primary verification identifier        |
| `identifier` | String   | Lookup key (e.g. email)                |
| `value`      | String   | Verification value (e.g. token / code) |
| `expires_at` | DateTime | Expiration timestamp                   |
| `created_at` | DateTime | Defaults to `now()`                    |
| `updated_at` | DateTime | Defaults to `now()`                    |

Engine: `ReplacingMergeTree(updated_at)`  
Order key: `(identifier, value)`  
TTL: `expires_at DELETE`
