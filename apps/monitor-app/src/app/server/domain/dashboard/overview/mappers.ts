import {
  GetDashboardOverviewQuery,
  IntervalKey,
  MetricName,
  TimeRangeKey,
  getEffectiveInterval,
  parseTimeRange,
} from "@/app/server/domain/dashboard/overview/types";
import { DeviceFilter } from "@/app/server/lib/device-types";

const DEFAULT_TIME_RANGE: TimeRangeKey = "7d";
const DEFAULT_TOP_ROUTES_LIMIT = 5;

export type BuildDashboardOverviewQueryInput = {
  projectId: string;
  timeRange?: TimeRangeKey;
  interval?: IntervalKey;
  deviceType?: DeviceFilter;
  selectedMetric?: MetricName;
  topRoutesLimit?: number;
};

/**
 * Builds a normalized query DTO for the dashboard overview.
 *
 * This helper exists mainly to centralize **defaults** and keep call sites small:
 * server components can pass only the values they care about and rely on stable defaults.
 *
 * If interval is not provided or invalid for the time range, defaults to the
 * first valid interval for that time range.
 */
export function buildDashboardOverviewQuery(input: BuildDashboardOverviewQueryInput): GetDashboardOverviewQuery {
  const timeRange = input.timeRange ?? DEFAULT_TIME_RANGE;
  const { start, end } = parseTimeRange(timeRange);
  const interval = getEffectiveInterval(input.interval, timeRange);

  return {
    projectId: input.projectId,
    deviceType: input.deviceType ?? "all",
    range: { start, end },
    interval,
    selectedMetric: input.selectedMetric ?? "LCP",
    topRoutesLimit: input.topRoutesLimit ?? DEFAULT_TOP_ROUTES_LIMIT,
  };
}
