## Code style & architecture guidelines

This repo is a monorepo (Next.js apps + shared packages). The goal of these guidelines is to keep code **consistent, readable, testable, and fast** as the project grows.

## Formatting & tooling

- **Follow the existing lint + prettier setup**. Don’t introduce new formatting conventions per feature.
- **Prefer small, focused PRs**: keep refactors separate from behavior changes when possible.
- **Keep imports stable**:
  - In `apps/monitor-app`, prefer `@/…` absolute imports (project alias) over deep relative paths.

## Project structure (feature-first)

### Apps / packages

- **`apps/monitor-app`**: monitor UI + API (Next.js).
- **`apps/client-app`**: demo app.
- **`packages/*`**: shared libraries (e.g. `client-sdk`, `cwv-monitor-contracts`).

### Server-side layering (monitor-app)

#### API routes (`apps/monitor-app/src/app/api/**`)

- **Own HTTP concerns**:
  - parse request input
  - validate using schema
  - set headers (CORS, cache, etc.)
  - choose HTTP status codes
  - shape `NextResponse`
- **Build a DTO** (Command/Query) via a mapper.
- **Call a service**, then map its `kind` result to HTTP.

#### Domain (`apps/monitor-app/src/app/server/domain/**`)

Organize by product slice / use-case. Each use-case module typically has:

```text
apps/monitor-app/src/app/server/domain/<feature>/<use-case>/
  types.ts
  mappers.ts
  service.ts
```

- **`types.ts`**: DTOs + result types.
- **`mappers.ts`**: coercion/defaults/normalization into stable DTOs.
- **`service.ts`**: invariants + orchestration + mapping to response models.

#### Repositories (`apps/monitor-app/src/app/server/lib/clickhouse/repositories/**`)

- **Own DB concerns**: ClickHouse SQL, filters, ordering, limits, DB conversions.
- Return **typed rows / DTOs** (not HTTP responses).
- Prefer integration tests for SQL against ClickHouse containers.

#### Shared server libs (`apps/monitor-app/src/app/server/lib/**`)

Cross-cutting utilities: logging, rate limiting, device type coercion, thresholds, auth, etc.

## Boundary rule: validate at the edges

- Treat everything coming from the network / cookies / headers / query params as **`unknown`**.
- Validate + normalize in the **API route** (and/or mapper) before calling services.
- Services should assume they receive well-formed DTOs.

## Commands vs Queries

### Commands (write-side)

Use a `*Command` when the operation **mutates state** or has **side effects**.

- **Name**: `IngestCommand`, `CreateProjectCommand`, …
- **Call**: `SomeService.handle(command)`
- **Return**: tagged union with explicit outcomes:
  - `{ kind: 'ok' | 'rate-limit' | 'project-not-found' | ... }`

Command DTOs must be **fully normalized** before reaching the service.

### Queries (read-side)

Use a `*Query` when the operation **reads data**.

- **Name**: `GetDashboardOverviewQuery`, `ListRoutesQuery`, …
- **Call**: `SomeService.getX(query)`
- **Return**:
  - tagged union when failure modes exist (not found / forbidden / unsupported metric)
  - or direct data when failure modes are not expected

## Services: what belongs in a service

Services should be **transport-agnostic**.

- **Do not own HTTP concerns**:
  - no `NextRequest` parsing
  - no CORS headers
  - no choosing HTTP status codes
  - no `NextResponse`
- **Do own invariants + orchestration**:
  - project exists
  - multi-tenancy scoping and authz checks
  - choosing data source (aggregates vs raw, hourly vs daily)
  - combining repository calls
  - mapping DB rows → stable domain response shapes
  - optional caching / fallbacks / timeouts (when justified)

## Repositories: what belongs in a repository

Repositories should be DB-shaped and boring:

- SQL lives here.
- Keep filters explicit; avoid hidden global filters.
- Return typed rows/DTOs; avoid business-level decisions that belong in services.
- It’s okay to have **use-case-specific repositories** (e.g. dashboard overview) when the query is inherently tied to one screen/use-case.

### ClickHouse query guidelines

- Always include `project_id = ?` in `WHERE` for multi-tenancy and data skipping.
- Prefer bounded time filters (`recorded_at BETWEEN …`, `event_date BETWEEN …`) to enable partition pruning.
- Keep “raw events” vs “aggregates” intent explicit:
  - daily aggregates can’t answer hour-level questions (granularity is gone)
  - use raw events or create hourly aggregates/materialized views when needed

### “One query” vs `Promise.all` (ClickHouse)

ClickHouse does **not** provide multi-statement transactions/snapshots for multiple selects.

- **Single combined query** (often `UNION ALL` with a `section`/`kind` column):
  - single round-trip
  - consistent snapshot across dashboard sections
  - can share work inside the query in some cases
- **Multiple queries** (parallel via `Promise.all`):
  - more maintainable SQL per query
  - parallelizable
  - can observe slightly different data between queries under concurrent ingest

Rule of thumb:

- If the UI needs **coherent sections** + strict latency, consider a combined query.
- If you’re iterating and slight drift is acceptable, start with multiple repo calls and merge later if needed.

## TypeScript guidelines

- Prefer **explicit types at boundaries** (DTOs, repository results). Avoid leaking `any`.
- Use `unknown` for untrusted input and validate.
- Keep domain DTOs stable:
  - prefer `Date` inside domain layer
  - convert to DB-friendly strings/seconds at the repository boundary

## Error handling & logging

- Prefer **typed results** (tagged unions) for expected outcomes over throwing.
- Throw only for truly unexpected programmer/config errors.
- Use structured logs (`logger.*`) with stable event keys (e.g. `ingest.invalid_schema`).
- Don’t log sensitive data (tokens, raw payloads that may contain PII).

## Testing

- **Repository**: integration tests against ClickHouse containers (SQL correctness).
- **Service**: unit tests for mapping + invariants by stubbing repositories; integration tests only when it’s a “read model” and worth the cost.
