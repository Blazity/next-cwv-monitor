import type { DateRange, GetRouteDetailQuery, MetricName, RoutesDeviceType } from '@/app/server/domain/routes/detail/types';

const DEFAULT_RANGE_DAYS = 7;

export type BuildRouteDetailQueryInput = {
  projectId: string;
  route: string;
  range?: Partial<DateRange>;
  deviceType?: RoutesDeviceType;
  selectedMetric?: MetricName;
};

function defaultRange(): DateRange {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - DEFAULT_RANGE_DAYS);
  return { start, end };
}

/**
 * Builds a normalized query DTO for route detail.
 *
 * Centralizes defaults and keeps call sites small.
 */
export function buildRouteDetailQuery(input: BuildRouteDetailQueryInput): GetRouteDetailQuery {
  const fallback = defaultRange();
  const end = input.range?.end ?? fallback.end;
  const start = input.range?.start ?? fallback.start;

  return {
    projectId: input.projectId,
    route: input.route,
    deviceType: input.deviceType ?? 'all',
    range: { start, end },
    selectedMetric: input.selectedMetric ?? 'LCP'
  };
}


