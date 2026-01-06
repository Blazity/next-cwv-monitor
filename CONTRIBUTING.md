# Contributing to next-cwv-monitor

Thanks for helping improve our self-hosted Core Web Vitals monitor. This guide explains how we work, how to run the project, name commits, and open PRs in line with `CODE_STYLE.md`.

## Principles (read this first)

- Keep changes small and focused; split refactors from behavior changes.
- Validate at the edges; services stay transport-agnostic; repositories own SQL.
- Use explicit types at boundaries (`unknown` for untrusted input), DTOs, and tagged-union results for expected outcomes.
- Keep imports stable (absolute `@/…` in `apps/monitor-app`); avoid deep relatives.

## Repository map

- `apps/monitor-app` — Monitor UI + API (Next.js). Layered domain/services/repos; ClickHouse-backed.
- `apps/client-app` — Demo Next.js app using the SDK.
- `packages/client-sdk` — SDK shipped to monitored apps (tsup + Vitest).
- `packages/cwv-monitor-contracts` — Shared types/schemas.

## Requirements

- Node.js ≥ 20
- pnpm ≥ 10.1
- Docker + Docker Compose (recommended for full stack)

## Workflow options

### A) Full stack via Docker (recommended)

```bash
pnpm install
pnpm docker:dev
```

- Brings up ClickHouse and the apps, runs migrations, and seeds demo data automatically.
- Monitor: http://localhost:3000
- Demo client: http://localhost:3001

### B) Local dev without Docker (per-package)

1. Environment:

- Copy `apps/monitor-app/.env.example` → `apps/monitor-app/.env` and fill values.
- (Optional) Copy `apps/client-app/.env.example` or `.env.ci` → `apps/client-app/.env`.

2. Run apps individually:

```bash
pnpm --filter cwv-monitor-app dev      # monitor app only
pnpm --filter cwv-monitor-client dev   # demo app only
pnpm --filter cwv-monitor-sdk dev      # SDK watch build
```

3. ClickHouse when not using `docker:dev`:

```bash
pnpm --filter cwv-monitor-app clickhouse:migrate
pnpm --filter cwv-monitor-app seed:demo   # optional demo data
```

## Coding conventions (from `CODE_STYLE.md`, highlights)

- API routes own HTTP concerns (parse, validate, status codes, responses).
- Services enforce invariants/orchestration; no `NextRequest/NextResponse`.
- Repositories own SQL and DB conversions; always scope by `project_id`; prefer bounded time filters.
- Commands (`*Command`) for mutations/side-effects; queries (`*Query`) for reads.
- Keep domain DTOs stable; use `Date` in domain, convert at repository boundaries.

## Testing & checks

- **SDK** (`packages/client-sdk`):
  ```bash
  pnpm --filter cwv-monitor-sdk lint
  pnpm --filter cwv-monitor-sdk test
  pnpm --filter cwv-monitor-sdk build
  # Optional: pnpm --filter cwv-monitor-sdk check-size
  ```
- **Monitor app** (`apps/monitor-app`):
  ```bash
  pnpm --filter cwv-monitor-app lint
  pnpm --filter cwv-monitor-app build
  pnpm --filter cwv-monitor-app test:integration   # needs ClickHouse running
  pnpm --filter cwv-monitor-app storybook          # optional, :6006
  ```
- **Demo client** (`apps/client-app`):
  ```bash
  pnpm --filter cwv-monitor-client lint
  pnpm --filter cwv-monitor-client build
  ```

CI only runs builds/tests for changed areas and will fail if your branch is behind `main`, so keep it rebased:

```bash
git fetch origin
git rebase origin/main
```

## Commit messages

Use Conventional Commits; add scope when helpful:

- `feat(monitor-app): add device filter to overview`
- `fix(client-sdk): debounce route changes`
- `chore(ci): fail early when branch is behind`
- `docs: clarify local setup`

## Pull requests

- Keep PRs small and focused; split large changes.
- Include what/why, tests run, and any migration/env changes. Add screenshots for UI.
- Update docs when behavior or configuration changes (`README.md`, `CODE_STYLE.md`, package READMEs).
- Ensure schema/SQL changes have migrations and (ideally) integration tests.
- Request review once checks pass; respond to feedback promptly.

## Getting help

If unsure, open a GitHub issue or discussion with context (problem, proposed approach, affected areas). Early drafts are welcome.

## Resources

| Doc                                                                                | Description                      |
| ---------------------------------------------------------------------------------- | -------------------------------- |
| [`CODE_STYLE.md`](./CODE_STYLE.md)                                                 | Architecture & coding guidelines |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md)                                             | System design deep dive          |
| [`packages/client-sdk/README.md`](./packages/client-sdk/README.md)                 | SDK usage                        |
| [`apps/monitor-app/clickhouse/SCHEMA.md`](./apps/monitor-app/clickhouse/SCHEMA.md) | Database schema                  |
