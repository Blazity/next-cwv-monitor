import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {},
  client: {
    NEXT_PUBLIC_MONITOR_API: z.string(),
    NEXT_PUBLIC_MONITOR_PROJECT_ID: z.string(),
    NEXT_PUBLIC_DISABLE_BEACON: z.string().optional()
  },
  runtimeEnv: {
    NEXT_PUBLIC_MONITOR_API: process.env.NEXT_PUBLIC_MONITOR_API,
    NEXT_PUBLIC_MONITOR_PROJECT_ID: process.env.NEXT_PUBLIC_MONITOR_PROJECT_ID,
    NEXT_PUBLIC_DISABLE_BEACON: process.env.NEXT_PUBLIC_DISABLE_BEACON
  }
});
