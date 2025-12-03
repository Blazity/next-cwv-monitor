import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

export const env = createEnv({
  server: {
    API_TOKEN: z.string()
  },
  client: {},
  runtimeEnv: {
    API_TOKEN: process.env.API_TOKEN
  }
});
