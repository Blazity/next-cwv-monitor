FROM node:24-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc*  pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/package.json ./package.json

COPY . .

# Build-time env vars required for compilation
ENV LOG_LEVEL=info
ENV AUTH_BASE_URL=http://localhost:3000
ENV CLICKHOUSE_HOST=localhost
ENV CLICKHOUSE_PORT=8123
ENV CLICKHOUSE_DB=cwv_monitor
ENV CLICKHOUSE_USER=default
ENV CLICKHOUSE_PASSWORD=build-placeholder
ENV SLACK_WEBHOOK_URL=""
ENV TEAMS_WEBHOOK_URL=""

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm --filter anomaly-worker run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 cwvworker

COPY --from=builder --chown=cwvworker:nodejs /app/apps/anomaly-worker/dist ./apps/anomaly-worker/dist
COPY --from=builder --chown=cwvworker:nodejs /app/apps/anomaly-worker/package.json ./apps/anomaly-worker/package.json
COPY --from=builder --chown=cwvworker:nodejs /app/node_modules ./node_modules

USER cwvworker

CMD ["node", "apps/anomaly-worker/dist/anomaly-worker/src/index.js"]
