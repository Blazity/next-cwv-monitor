import { waddler } from "waddler/clickhouse";
import { env } from "@/env";

type SqlTag = ReturnType<typeof waddler>;

let cachedSql: SqlTag | null = null;

function buildConnectionUrl(): string {
  const host = env.CLICKHOUSE_HOST;
  const port = env.CLICKHOUSE_PORT;
  const userRaw = env.AI_ANALYST_CLICKHOUSE_USER;
  const passwordRaw = env.AI_ANALYST_CLICKHOUSE_PASSWORD;
  const dbRaw = env.CLICKHOUSE_DB;

  // During `next build` we intentionally skip env validation (see `src/env.ts`).
  // In CI (or any environment) where ClickHouse isn't configured, we must NOT
  // throw at module-import time because Next evaluates route modules during build.
  if (!host || !port || !userRaw || !dbRaw) {
    throw new Error(
      "ClickHouse is not configured for Agent. Set CLICKHOUSE_HOST, CLICKHOUSE_PORT, AI_ANALYST_CLICKHOUSE_USER and CLICKHOUSE_DB " +
        "(and optional CLICKHOUSE_PASSWORD and AI_ANALYST_CLICKHOUSE_PASSWORD) to enable database access.",
    );
  }

  const user = encodeURIComponent(userRaw);
  const password = passwordRaw ? encodeURIComponent(passwordRaw) : "";
  const auth = password ? `${user}:${password}@` : `${user}@`;
  const db = `/${encodeURIComponent(dbRaw)}`;

  return `http://${auth}${host}:${port}${db}`;
}

function getSql(): SqlTag {
  cachedSql ??= waddler(buildConnectionUrl());
  return cachedSql;
}

/**
 * Lazy ClickHouse SQL tag.
 *
 * Important: do NOT create the client at module import time because `next build`
 * evaluates server modules even when ClickHouse env vars are not present.
 */
// eslint-disable-next-line unicorn/no-useless-undefined -- Used only as a Proxy target; the real client is created lazily in `getSql()`.
export const agentSql: SqlTag = new Proxy((() => undefined) as unknown as SqlTag, {
  apply(_target, thisArg, argArray) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Proxy-forwarding to a callable tag isn't expressible without a cast.
    return (getSql() as any).apply(thisArg, argArray);
  },
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Proxy-forwarding dynamic property access isn't expressible without a cast.
    return (getSql() as any)[prop];
  },
});
