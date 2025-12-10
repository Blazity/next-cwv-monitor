import { createClient } from '@clickhouse/client';
import { env } from '../env';

export const db = createClient({
  url: env.CLICKHOUSE_URL,
  database: env.CLICKHOUSE_DATABASE,
  username: env.CLICKHOUSE_USER,
  password: env.CLICKHOUSE_PASSWORD,
});
