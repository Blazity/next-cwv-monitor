/* eslint-disable unicorn/prefer-top-level-await */
import { z } from 'zod';
import { TIME_RANGES, OVERVIEW_DEVICE_TYPES } from '@/app/server/domain/dashboard/overview/types';

export const dashboardSearchParamsSchema = z.object({
  timeRange: z.enum(TIME_RANGES.map((r) => r.value)).catch('7d'),
  deviceType: z.enum(OVERVIEW_DEVICE_TYPES).catch('all')
});

export const eventsSearchParamsSchema = dashboardSearchParamsSchema.and(
  z.object({
    event: z.string().optional()
  })
);
