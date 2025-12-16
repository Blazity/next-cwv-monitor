import { afterEach } from 'vitest';

import { ipRateLimiter } from '@/app/server/lib/rate-limit';

process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent';

afterEach(async () => {
  await ipRateLimiter.reset();
});
