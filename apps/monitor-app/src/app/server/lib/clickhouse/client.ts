import { waddler } from 'waddler/clickhouse';
import { env as envOriginal } from '@/env';

const env = { ...envOriginal };

if (process.env.SKIP_VALIDATION === 'true') {
  env.CLICKHOUSE_DB = 'cwv_monitor';
  env.CLICKHOUSE_USER = 'default';
  env.CLICKHOUSE_PASSWORD = 'secret';
  env.CLICKHOUSE_HOST = 'localhost';
  env.CLICKHOUSE_PORT = '8123';
}

const user = encodeURIComponent(env.CLICKHOUSE_USER);
const password = env.CLICKHOUSE_PASSWORD ? encodeURIComponent(env.CLICKHOUSE_PASSWORD) : '';
const auth = password ? `${user}:${password}@` : `${user}@`;
const db = env.CLICKHOUSE_DB ? `/${encodeURIComponent(env.CLICKHOUSE_DB)}` : '';
const connectionUrl = `http://${auth}${env.CLICKHOUSE_HOST}:${env.CLICKHOUSE_PORT}${db}`;

export const sql = waddler(connectionUrl);
