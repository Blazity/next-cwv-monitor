import { waddler } from 'waddler/clickhouse';
import { env } from '@/env';

const user = encodeURIComponent(env.CLICKHOUSE_USER);
const password = env.CLICKHOUSE_PASSWORD ? encodeURIComponent(env.CLICKHOUSE_PASSWORD) : '';
const auth = password ? `${user}:${password}@` : `${user}@`;
const db = env.CLICKHOUSE_DB ? `/${encodeURIComponent(env.CLICKHOUSE_DB)}` : '';
const connectionUrl = `http://${auth}${env.CLICKHOUSE_HOST}:${env.CLICKHOUSE_PORT}${db}`;

export const sql = waddler(connectionUrl);
