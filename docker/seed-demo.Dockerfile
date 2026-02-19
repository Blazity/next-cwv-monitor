FROM node:24-alpine

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/monitor-app/package.json ./apps/monitor-app/
COPY packages ./packages

# Install dependencies (including devDependencies for faker)
RUN corepack enable pnpm && pnpm install --filter cwv-monitor-app --frozen-lockfile

# Copy seed script and any dependencies it needs
COPY apps/monitor-app/scripts/seed-demo-data.mjs ./apps/monitor-app/scripts/

WORKDIR /app/apps/monitor-app

CMD ["node", "./scripts/seed-demo-data.mjs"]


