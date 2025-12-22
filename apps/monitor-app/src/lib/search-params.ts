import { z } from 'zod';
import { TIME_RANGES, OVERVIEW_DEVICE_TYPES } from '@/app/server/domain/dashboard/overview/types';

const dashboardSearchParamsSchema = z.object({
  timeRange: z.enum(TIME_RANGES).default('7d'),
  deviceType: z.enum(OVERVIEW_DEVICE_TYPES).default('all')
});

type DashboardSearchParams = z.infer<typeof dashboardSearchParamsSchema>;

function getSearchParamValue(
  searchParams: { [key: string]: string | string[] | undefined },
  key: string
): string | undefined {
  const value = searchParams[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export async function loadDashboardSearchParams(
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
): Promise<DashboardSearchParams> {
  const resolvedParams = await searchParams;

  const rawParams = {
    timeRange: getSearchParamValue(resolvedParams, 'timeRange'),
    deviceType: getSearchParamValue(resolvedParams, 'deviceType')
  };

  return dashboardSearchParamsSchema.parse(rawParams);
}
