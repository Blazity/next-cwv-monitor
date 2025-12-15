import { waddler } from 'waddler/clickhouse';
import { env as envOriginal } from '@/env';

const env = { ...envOriginal };

// TODO: this is added because it crashes on our CI if env's are not set
// we should figure out a proper fix and remove it
if (process.env.SKIP_VALIDATION === 'true') {
  // Important: don't override values that were explicitly set (e.g. by testcontainers in integration tests)
  // or we'll end up connecting to the wrong host/port (most commonly localhost:8123).
  env.CLICKHOUSE_DB = process.env.CLICKHOUSE_DB ?? env.CLICKHOUSE_DB ?? 'cwv_monitor';
  env.CLICKHOUSE_USER = process.env.CLICKHOUSE_USER ?? env.CLICKHOUSE_USER ?? 'default';
  env.CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD ?? env.CLICKHOUSE_PASSWORD ?? 'secret';
  env.CLICKHOUSE_HOST = process.env.CLICKHOUSE_HOST ?? env.CLICKHOUSE_HOST ?? 'localhost';
  env.CLICKHOUSE_PORT = process.env.CLICKHOUSE_PORT ?? env.CLICKHOUSE_PORT ?? '8123';
}

const user = encodeURIComponent(env.CLICKHOUSE_USER);
const password = env.CLICKHOUSE_PASSWORD ? encodeURIComponent(env.CLICKHOUSE_PASSWORD) : '';
const auth = password ? `${user}:${password}@` : `${user}@`;
const db = env.CLICKHOUSE_DB ? `/${encodeURIComponent(env.CLICKHOUSE_DB)}` : '';
const connectionUrl = `http://${auth}${env.CLICKHOUSE_HOST}:${env.CLICKHOUSE_PORT}${db}`;

export const sql = waddler(connectionUrl);
