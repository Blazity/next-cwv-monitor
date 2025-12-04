import { createEnv } from '@t3-oss/env-nextjs';
import z from 'zod';

export const env = createEnv({
  server: {
    API_TOKEN: z.string(),
    CLIENT_APP_ORIGIN: z.url()
  },
  client: {},
  skipValidation: process.env.SKIP_VALIDATION === 'true',
  runtimeEnv: {
    API_TOKEN: process.env.API_TOKEN,
    CLIENT_APP_ORIGIN: process.env.CLIENT_APP_ORIGIN
  }
});
