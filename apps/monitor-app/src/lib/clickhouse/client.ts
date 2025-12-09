import { waddler } from 'waddler/clickhouse';
import { env } from '@/env';

export const sql = waddler(env.CLICKHOUSE_URL ?? `http://${env.CLICKHOUSE_HOST}:${env.CLICKHOUSE_PORT}`);
