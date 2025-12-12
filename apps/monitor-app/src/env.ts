import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

const lifecycleEvent = process.env.npm_lifecycle_event ?? '';
const isBuildCommand = lifecycleEvent === 'build' || lifecycleEvent.startsWith('build:');

export const env = createEnv({
  server: {
    API_TOKEN: z.string(),
    CLIENT_APP_ORIGIN: z.url(),
    CLICKHOUSE_HOST: z.string().min(1, 'CLICKHOUSE_HOST is required'),
    CLICKHOUSE_PORT: z.string().min(1, 'CLICKHOUSE_PORT is required'),
    CLICKHOUSE_USER: z.string().min(1, 'CLICKHOUSE_USER is required'),
    CLICKHOUSE_PASSWORD: z.string(),
    CLICKHOUSE_DB: z.string().min(1, 'CLICKHOUSE_DB is required'),
    BETTER_AUTH_SECRET: z.string(),
    CLICKHOUSE_ADAPTER_DEBUG_LOGS: z.coerce.boolean().default(false)
  },
  client: {
    NEXT_PUBLIC_MIN_PASSWORD_SCORE: z.number().min(0).max(4).default(2)
  },
  skipValidation: process.env.SKIP_VALIDATION === 'true' || isBuildCommand,
  runtimeEnv: {
    API_TOKEN: process.env.API_TOKEN,
    NEXT_PUBLIC_MIN_PASSWORD_SCORE: process.env.NEXT_PUBLIC_MIN_PASSWORD_SCORE,
    CLIENT_APP_ORIGIN: process.env.CLIENT_APP_ORIGIN,
    CLICKHOUSE_HOST: process.env.CLICKHOUSE_HOST,
    CLICKHOUSE_PORT: process.env.CLICKHOUSE_PORT,
    CLICKHOUSE_USER: process.env.CLICKHOUSE_USER,
    CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD,
    CLICKHOUSE_DB: process.env.CLICKHOUSE_DB,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    CLICKHOUSE_ADAPTER_DEBUG_LOGS: process.env.CLICKHOUSE_ADAPTER_DEBUG_LOGS
  }
});
