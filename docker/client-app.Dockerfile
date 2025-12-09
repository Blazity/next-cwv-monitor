FROM node:20-alpine AS base

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

RUN \
  if [ -f yarn.lock ]; then yarn run build:prod; \
  elif [ -f package-lock.json ]; then npm run build:prod; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build:prod; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/client-app/public ./apps/client-app/public

COPY --from=builder --chown=nextjs:nodejs /app/apps/client-app/.next/standalone/ ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/client-app/.next/static ./apps/client-app/.next/static

USER nextjs

EXPOSE 3001

ENV PORT=3001

ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/client-app/server.js"]