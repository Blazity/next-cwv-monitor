import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {},
  client: {
    NEXT_PUBLIC_MONITOR_API: z.string(),
    NEXT_PUBLIC_MONITOR_API_KEY: z.string()
  },
  skipValidation: process.env.SKIP_VALIDATION === 'true',
  runtimeEnv: {
    NEXT_PUBLIC_MONITOR_API: process.env.NEXT_PUBLIC_MONITOR_API,
    NEXT_PUBLIC_MONITOR_API_KEY: process.env.NEXT_PUBLIC_MONITOR_API_KEY
  }
});
