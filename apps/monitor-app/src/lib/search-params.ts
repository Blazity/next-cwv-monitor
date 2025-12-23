import { z } from 'zod';
import { TIME_RANGES, OVERVIEW_DEVICE_TYPES } from '@/app/server/domain/dashboard/overview/types';

type SearchParams = { [key: string]: string | string[] | undefined };
type PreprocessedSearchParams = Record<string, string | undefined>;

function preprocessSearchParams(params: SearchParams): PreprocessedSearchParams {
  const preprocessed: PreprocessedSearchParams = {};
  for (const [key, value] of Object.entries(params)) {
    preprocessed[key] = Array.isArray(value) ? value[0] : value;
  }
  return preprocessed;
}

export async function loadSearchParams<T extends z.ZodTypeAny>(
  searchParams: Promise<SearchParams>,
  schema: T
): Promise<z.infer<T>> {
  const resolvedParams = await searchParams;
  const preprocessed = preprocessSearchParams(resolvedParams);
  const result = schema.parse(preprocessed);
  return result as z.infer<T>;
}

const dashboardSearchParamsSchema = z.object({
  // eslint-disable-next-line unicorn/prefer-top-level-await -- Zod's .catch() is not a promise method
  timeRange: z.enum(TIME_RANGES).catch('7d'),
  // eslint-disable-next-line unicorn/prefer-top-level-await -- Zod's .catch() is not a promise method
  deviceType: z.enum(OVERVIEW_DEVICE_TYPES).catch('all')
});

type DashboardSearchParams = z.infer<typeof dashboardSearchParamsSchema>;

export async function loadDashboardSearchParams(searchParams: Promise<SearchParams>): Promise<DashboardSearchParams> {
  return loadSearchParams(searchParams, dashboardSearchParamsSchema);
}
