# Contributing

Thanks for helping us improve next-cwv-monitor! This guide covers development setup, coding standards, and how to submit changes.

> 📐 New to the codebase? Start with [`ARCHITECTURE.md`](./ARCHITECTURE.md) for a system design overview.

## Repository map

- `apps/monitor-app` — Monitor UI + API (Next.js). Layered domain/services/repos; ClickHouse-backed.
- `apps/client-app` — Demo Next.js app using the SDK.
- `packages/client-sdk` — SDK shipped to monitored apps (tsup + Vitest).
- `packages/cwv-monitor-contracts` — Shared types/schemas.

## Requirements

- Node.js ≥ 20
- pnpm > 10.1
- Docker + Docker Compose

## Development setup

```bash
cp apps/monitor-app/.env.example apps/monitor-app/.env
pnpm install
pnpm docker:dev
```

- Brings up ClickHouse and the monitor app, runs migrations, and seeds demo data automatically.
- Monitor: http://localhost:3000
- Login with credentials from your `.env` file (defaults: `user@example.com` / `password`)

## Coding conventions

Key highlights (see [`CODE_STYLE.md`](./CODE_STYLE.md) for the full guide):

- **API routes** own HTTP concerns (parse, validate, status codes, responses).
- **Services** enforce invariants/orchestration; no `NextRequest/NextResponse`.
- **Repositories** own SQL and DB conversions; always scope by `project_id`; prefer bounded time filters. See [`SCHEMA.md`](./apps/monitor-app/clickhouse/SCHEMA.md) for database structure.
- **Commands** (`*Command`) for mutations/side-effects; **queries** (`*Query`) for reads.
- Keep domain DTOs stable; use `Date` in domain, convert at repository boundaries.

## Testing & checks

- **SDK** (`packages/client-sdk`) — see [`SDK README`](./packages/client-sdk/README.md) for API details:
  ```bash
  pnpm --filter next-cwv-monitor lint
  pnpm --filter next-cwv-monitor test
  pnpm --filter next-cwv-monitor build
  ```
- **Monitor app** (`apps/monitor-app`):
  ```bash
  pnpm --filter cwv-monitor-app lint
  pnpm --filter cwv-monitor-app build
  pnpm --filter cwv-monitor-app test:integration
  ```

## Commit messages

Use Conventional Commits

## Pull requests

- Keep PRs small and focused; split large changes.
- Include what/why, tests run, and any migration/env changes. Add screenshots for UI.
- Update docs when behavior or configuration changes (`README.md`, `CODE_STYLE.md`, package READMEs).
- Ensure schema/SQL changes have migrations and (ideally) integration tests.
