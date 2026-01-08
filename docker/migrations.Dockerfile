FROM node:20-alpine

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/monitor-app/package.json ./apps/monitor-app/
COPY packages ./packages

# Install dependencies
RUN corepack enable pnpm && pnpm install --filter cwv-monitor-app --frozen-lockfile

# Copy migration files
COPY apps/monitor-app/clickhouse/migrations ./apps/monitor-app/clickhouse/migrations
COPY apps/monitor-app/scripts/run-clickhouse-migrate.mjs ./apps/monitor-app/scripts/

WORKDIR /app/apps/monitor-app

CMD ["node", "./scripts/run-clickhouse-migrate.mjs"]

