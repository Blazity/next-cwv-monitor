import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

const CLICKHOUSE_DEFAULTS = {
  host: 'clickhouse',
  port: '8123',
  user: 'default',
  password: 'secret',
  db: 'cwv_monitor'
} as const;

export const env = createEnv({
  server: {
    API_TOKEN: z.string(),
    CLIENT_APP_ORIGIN: z.url(),
    CLICKHOUSE_URL: z.string().url().optional(),
    CLICKHOUSE_HOST: z.string().default(CLICKHOUSE_DEFAULTS.host),
    CLICKHOUSE_PORT: z.string().default(CLICKHOUSE_DEFAULTS.port),
    CLICKHOUSE_USER: z.string().default(CLICKHOUSE_DEFAULTS.user),
    CLICKHOUSE_PASSWORD: z.string().default(CLICKHOUSE_DEFAULTS.password),
    CLICKHOUSE_DB: z.string().default(CLICKHOUSE_DEFAULTS.db)
  },
  client: {},
  skipValidation: process.env.SKIP_VALIDATION === 'true',
  runtimeEnv: {
    API_TOKEN: process.env.API_TOKEN,
    CLIENT_APP_ORIGIN: process.env.CLIENT_APP_ORIGIN,
    CLICKHOUSE_URL: process.env.CLICKHOUSE_URL,
    CLICKHOUSE_HOST: process.env.CLICKHOUSE_HOST,
    CLICKHOUSE_PORT: process.env.CLICKHOUSE_PORT,
    CLICKHOUSE_USER: process.env.CLICKHOUSE_USER,
    CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD,
    CLICKHOUSE_DB: process.env.CLICKHOUSE_DB
  }
});
