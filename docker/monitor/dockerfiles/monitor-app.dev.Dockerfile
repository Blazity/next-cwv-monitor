FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable pnpm

CMD ["sh", "-c", "pnpm install && pnpm --filter cwv-monitor-app dev --hostname 0.0.0.0 --port 3000"]
