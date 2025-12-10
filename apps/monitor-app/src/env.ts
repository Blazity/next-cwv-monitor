import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

export const env = createEnv({
  server: {
    API_TOKEN: z.string(),
    CLIENT_APP_ORIGIN: z.url(),
    BETTER_AUTH_SECRET: z.string(),
    CLICKHOUSE_URL: z.string(),
    CLICKHOUSE_DATABASE: z.string(),
    CLICKHOUSE_USER: z.string(),
    CLICKHOUSE_PASSWORD: z.string()
  },
  client: {
    NEXT_PUBLIC_BETTER_AUTH_URL: z.url()
  },
  skipValidation: process.env.SKIP_VALIDATION === 'true',
  runtimeEnv: {
    API_TOKEN: process.env.API_TOKEN,
    CLIENT_APP_ORIGIN: process.env.CLIENT_APP_ORIGIN,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    CLICKHOUSE_URL: process.env.CLICKHOUSE_URL,
    CLICKHOUSE_DATABASE: process.env.CLICKHOUSE_DATABASE,
    CLICKHOUSE_USER: process.env.CLICKHOUSE_USER,
    CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD,
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL
  }
});
