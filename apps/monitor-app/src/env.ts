import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

const lifecycleEvent = process.env.npm_lifecycle_event ?? '';
const isBuildCommand = lifecycleEvent === 'build' || lifecycleEvent.startsWith('build:');

export const env = createEnv({
  server: {
    CLIENT_APP_ORIGIN: z.url(),
    TRUST_PROXY: z.enum(['true', 'false']).default('false'),
    CLICKHOUSE_HOST: z.string().min(1, 'CLICKHOUSE_HOST is required'),
    CLICKHOUSE_PORT: z.string().min(1, 'CLICKHOUSE_PORT is required'),
    CLICKHOUSE_USER: z.string().min(1, 'CLICKHOUSE_USER is required'),
    CLICKHOUSE_PASSWORD: z.string(),
    CLICKHOUSE_DB: z.string().min(1, 'CLICKHOUSE_DB is required'),
    BETTER_AUTH_SECRET: z.string(),
    CLICKHOUSE_ADAPTER_DEBUG_LOGS: z.coerce.boolean().default(false),
    MIN_PASSWORD_SCORE: z.coerce.number().min(0).max(4).default(2),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60_000),
    MAX_LOGIN_ATTEMPTS: z.coerce.number().positive().default(5)
  },
  client: {},
  skipValidation: process.env.SKIP_VALIDATION === 'true' || isBuildCommand,
  runtimeEnv: {
    MIN_PASSWORD_SCORE: process.env.MIN_PASSWORD_SCORE,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    MAX_LOGIN_ATTEMPTS: process.env.MAX_LOGIN_ATTEMPTS,
    CLIENT_APP_ORIGIN: process.env.CLIENT_APP_ORIGIN,
    TRUST_PROXY: process.env.TRUST_PROXY,
    CLICKHOUSE_HOST: process.env.CLICKHOUSE_HOST,
    CLICKHOUSE_PORT: process.env.CLICKHOUSE_PORT,
    CLICKHOUSE_USER: process.env.CLICKHOUSE_USER,
    CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD,
    CLICKHOUSE_DB: process.env.CLICKHOUSE_DB,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    CLICKHOUSE_ADAPTER_DEBUG_LOGS: process.env.CLICKHOUSE_ADAPTER_DEBUG_LOGS
  }
});
