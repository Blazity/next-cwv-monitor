import { waddler } from 'waddler/clickhouse';
import { env } from '@/env';

const auth = env.CLICKHOUSE_PASSWORD ? `${env.CLICKHOUSE_USER}:${env.CLICKHOUSE_PASSWORD}@` : `${env.CLICKHOUSE_USER}@`;
const db = env.CLICKHOUSE_DB ? `/${env.CLICKHOUSE_DB}` : '';
const connectionUrl = `http://${auth}${env.CLICKHOUSE_HOST}:${env.CLICKHOUSE_PORT}${db}`;

export const sql = waddler(connectionUrl);