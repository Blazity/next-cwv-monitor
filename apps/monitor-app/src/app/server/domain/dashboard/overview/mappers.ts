import type { DateRange, GetDashboardOverviewQuery, MetricName, OverviewDeviceType } from './types';

const DEFAULT_RANGE_DAYS = 7;
const DEFAULT_TOP_ROUTES_LIMIT = 5;

export type BuildDashboardOverviewQueryInput = {
  projectId: string;
  range?: Partial<DateRange>;
  deviceType?: OverviewDeviceType;
  selectedMetric?: MetricName;
  topRoutesLimit?: number;
};

function defaultRange(): DateRange {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - DEFAULT_RANGE_DAYS);
  return { start, end };
}

/**
 * Builds a normalized query DTO for the dashboard overview.
 *
 * This helper exists mainly to centralize **defaults** and keep call sites small:
 * server components can pass only the values they care about and rely on stable defaults.
 */
export function buildDashboardOverviewQuery(input: BuildDashboardOverviewQueryInput): GetDashboardOverviewQuery {
  const fallback = defaultRange();
  const end = input.range?.end ?? fallback.end;
  const start = input.range?.start ?? fallback.start;

  return {
    projectId: input.projectId,
    deviceType: input.deviceType ?? 'all',
    range: { start, end },
    selectedMetric: input.selectedMetric ?? 'LCP',
    topRoutesLimit: input.topRoutesLimit ?? DEFAULT_TOP_ROUTES_LIMIT
  };
}


