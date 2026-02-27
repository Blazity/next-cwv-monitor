import { waddler } from "waddler/clickhouse";
import { env } from "@/env";
import type { ClickHouseClient } from "@clickhouse/client";
import { createClient } from "@clickhouse/client";
import fs from "node:fs";
import path from "node:path";

export type SqlTag = ReturnType<typeof waddler>;

let cachedSql: SqlTag | null = null;
let cachedClient: ClickHouseClient | null = null;

let cachedAiSql: SqlTag | null = null;
let cachedAiClient: ClickHouseClient | null = null;

/**
 * Proactively syncs ClickHouse config from Vitest Global Setup.
 * This is crucial for parallel workers to find the dynamic container port
 * without triggering fragile env loading
 */
function getTestConnectionInfo() {
  const isTest = env.NODE_ENV === "test";
  if (!isTest) return null;

  const configPath = path.resolve(process.cwd(), ".vitest-ch-config.json");
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch {
      return null;
    }
  }
  return null;
}

function buildConnectionUrl(options?: { user?: string; password?: string }): string {
  const testInfo = getTestConnectionInfo();
  
  if (testInfo) {
    const host = String(testInfo.host);
    const port = String(testInfo.port);
    const user = encodeURIComponent(options?.user ?? env.CLICKHOUSE_USER);
    const passwordRaw = options?.user ? options.password : env.CLICKHOUSE_PASSWORD;
    const password = passwordRaw ? encodeURIComponent(passwordRaw) : "";
    const dbRaw = env.CLICKHOUSE_DB;
    
    const auth = password ? `${user}:${password}@` : `${user}@`;
    return `http://${auth}${host}:${port}/${encodeURIComponent(dbRaw)}`;
  }

  const host = env.CLICKHOUSE_HOST;
  const port = env.CLICKHOUSE_PORT;
  const userRaw = options?.user ?? env.CLICKHOUSE_USER;
  const dbRaw = env.CLICKHOUSE_DB;

  const user = encodeURIComponent(userRaw);
  const passwordRaw = options?.user ? options.password : env.CLICKHOUSE_PASSWORD;
  const password = passwordRaw ? encodeURIComponent(passwordRaw) : "";
  const auth = password ? `${user}:${password}@` : `${user}@`;
  const db = `/${encodeURIComponent(dbRaw)}`;

  return `http://${auth}${host}:${port}${db}`;
}

function getClient(): ClickHouseClient {
  if (cachedClient) return cachedClient;
  cachedClient = createClient({ url: buildConnectionUrl() });
  return cachedClient;
}

function getSql(): SqlTag {
  cachedSql ??= waddler(buildConnectionUrl());
  return cachedSql;
}

function getAiClient(): ClickHouseClient {
  if (cachedAiClient) return cachedAiClient;
  cachedAiClient = createClient({
    url: buildConnectionUrl({
      user: env.AI_ANALYST_CLICKHOUSE_USER,
      password: env.AI_ANALYST_CLICKHOUSE_PASSWORD,
    }),
  });
  return cachedAiClient;
}

function getAiSql(): SqlTag {
  cachedAiSql ??= waddler(buildConnectionUrl({
    user: env.AI_ANALYST_CLICKHOUSE_USER,
    password: env.AI_ANALYST_CLICKHOUSE_PASSWORD,
  }));
  return cachedAiSql;
}

function createProxy(factory: () => SqlTag): SqlTag {
  return new Proxy((() => {}) as unknown as SqlTag, {
    apply(_target, thisArg, argArray) {
      const instance = factory();
      const firstArg = argArray[0];

      if (Array.isArray(firstArg) && "raw" in firstArg) {
        return (instance as (...args: unknown[]) => unknown).apply(thisArg, argArray);
      }

      return (instance as (...args: unknown[]) => unknown)(...argArray);
    },
    get(_target, prop) {
      const instance = factory();
      const value = (instance as unknown as Record<string, unknown>)[prop as string];
      if (typeof value === "function") {
        return value.bind(instance);
      }
      return value;
    },
  });
}

export const sql: SqlTag = createProxy(getSql);

export const aiSql: SqlTag = createProxy(getAiSql);

export const getDirectClient = () => getClient();
export const getDirectAiClient = () => getAiClient();
