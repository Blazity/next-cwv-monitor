import { z } from 'zod';
import { TIME_RANGES, OVERVIEW_DEVICE_TYPES } from '@/app/server/domain/dashboard/overview/types';

export const dashboardSearchParamsSchema = z.object({
  // eslint-disable-next-line unicorn/prefer-top-level-await -- Zod's .catch() is not a promise method
  timeRange: z.enum(TIME_RANGES.map((r) => r.value)).catch('7d'),
  // eslint-disable-next-line unicorn/prefer-top-level-await -- Zod's .catch() is not a promise method
  deviceType: z.enum(OVERVIEW_DEVICE_TYPES).catch('all')
});
