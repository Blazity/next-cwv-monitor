# Architecture

System design overview for Next CWV Monitor - a self-hosted Core Web Vitals monitoring platform for Next.js.

## 1. Project Structure

```
apps/
  monitor-app        # Next.js dashboard & API

packages/
  client-sdk         # Browser SDK for CWV collection
  contracts          # Shared ingest payload schemas
```

## 2. System Diagram

```mermaid
flowchart LR
  subgraph Client["Instrumented Next.js app"]
    SDK["next-cwv-monitor<br>(web vitals + custom events)"]
  end
  subgraph Monitor["Monitor App (Next.js 16)"]
    Ingest["POST /api/ingest<br>schema + rate limit"]
    Dashboard["Dashboard UI + auth"]
  end
  subgraph CH["ClickHouse"]
    Raw["cwv_events & custom_events<br>MergeTree, TTL 90d"]
    Agg["cwv_daily_aggregates<br>AggregatingMergeTree, 365d"]
  end
  SDK -->|"batched payload"| Ingest
  Ingest -->|"validated & enriched"| Raw
  Raw -->|"mv_cwv_daily_aggregates"| Agg
  Dashboard -->|"analytics queries"| Agg
  Dashboard -->|"drill-down"| Raw
```

```mermaid
sequenceDiagram
  participant Browser
  participant SDK
  participant API as /api/ingest
  participant CH as ClickHouse

  Browser->>SDK: Web Vitals + custom events occur
  SDK-->>SDK: Queue & batch (size/time/unload triggers)
  SDK->>API: POST batched payload
  API-->>API: Validate (arktype schema)
  API-->>API: Rate limit by IP (if enabled)
  API->>CH: Insert rows into cwv_events / custom_events
  CH-->>CH: Materialized view updates daily aggregates
  API-->>SDK: 204 No Content (or error)
```

## 3. Core Components

### 3.1. Monitor App (`apps/monitor-app`)

The main dashboard for viewing Core Web Vitals, managing projects, and administering users.

- **Stack:** Next.js 16 App Router, Tailwind CSS, shadcn/ui
- **Auth:** Better Auth with role-based access (admin, user)
- **Ingest API:** Receives batched events from SDK, validates via arktype schemas, rate-limits by IP, and persists to ClickHouse
- **Deployment:** Docker container via `monitor-app.prod.Dockerfile`

### 3.2. Client SDK (`packages/client-sdk`)

Lightweight browser SDK that collects CWV metrics (LCP, FID, CLS, INP, TTFB, FCP), `$page_view` events, and custom business events.

- **Stack:** TypeScript, web-vitals, React hooks
- **Entrypoints:** `next-cwv-monitor/app-router` and `next-cwv-monitor/pages-router`
- **Privacy:** In-memory session ID per page view — no cookies or localStorage
- **Batching:** Flushes on queue ≥10, 50ms idle, or page unload (sendBeacon)

### 3.3. Contracts (`packages/cwv-monitor-contracts`)

Shared TypeScript schemas for ingest payloads. Imported by both SDK and monitor app to prevent drift.

## 4. Data Store

**ClickHouse** — High-performance columnar database for analytics.

> Full schema details: [`apps/monitor-app/clickhouse/SCHEMA.md`](./apps/monitor-app/clickhouse/SCHEMA.md)

**Design choices:**

- `project_id` in every table for multi-tenancy
- Append-only MergeTree for fast writes
- `quantilesState()` for efficient percentile queries (p50–p99)
- TTL-based retention for automatic cleanup
- `LowCardinality` for enum-like columns

## 5. Deployment

| Mode        | Command                         | Description                  |
| ----------- | ------------------------------- | ---------------------------- |
| Development | `pnpm docker:dev`               | Hot reload, seeded demo data |
| Production  | [Setup wizard](./DEPLOYMENT.md) | Guided setup with SSL option |

The setup wizard downloads Docker Compose files, configures secrets automatically, and optionally sets up SSL via Caddy.

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for full configuration options and environment variables.

## 6. Security

- **Auth:** Better Auth with email/password; role-based access control
- **Rate limiting:** IP-based on ingest endpoint
- **Sessions:** Stored in ClickHouse with TTL expiration
- **SDK privacy:** Ephemeral session IDs only — no PII collected

## 7. Development

**Local setup:** See [Quick Start](./README.md#-quick-start)

```bash
pnpm install
pnpm docker:dev
```

**Testing:** Vitest + React Testing Library

**Code quality:** ESLint, Prettier, TypeScript strict mode

**Storybook:** `apps/monitor-app/src/stories/`
