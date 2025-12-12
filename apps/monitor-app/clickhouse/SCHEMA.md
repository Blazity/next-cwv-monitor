# ClickHouse Schema

This document describes the multi-tenant ClickHouse schema used by the monitor app and the rationale behind the design.

## Tables & Columns

### `projects`

| Column       | Type     | Notes                      |
| ------------ | -------- | -------------------------- |
| `id`         | UUID     | Primary project identifier |
| `slug`       | String   | Human-friendly identifier  |
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
