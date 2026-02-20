import {
  GetDashboardOverviewQuery,
  IntervalKey,
  MetricName,
  TimeRangeKey,
  getEffectiveInterval,
} from "@/app/server/domain/dashboard/overview/types";
import { DeviceFilter } from "@/app/server/lib/device-types";
import { timeRangeToDateRange } from "@/lib/utils";

const DEFAULT_TIME_RANGE: TimeRangeKey = "7d";
const DEFAULT_TOP_ROUTES_LIMIT = 5;

export type BuildDashboardOverviewQueryInput = {
  projectId: string;
  timeRange?: TimeRangeKey;
  customStart?: Date | null; 
  customEnd?: Date | null;
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

  const isCustom = Boolean(input.customStart && input.customEnd);
  const range = isCustom 
  ? { start: input.customStart!, end: input.customEnd! }
  : timeRangeToDateRange(input.timeRange ?? DEFAULT_TIME_RANGE);

  const interval = getEffectiveInterval(
    input.interval ?? null, 
    input.timeRange ?? DEFAULT_TIME_RANGE, 
    { from: input.customStart ?? null, to: input.customEnd ?? null }
  );

  return {
    projectId: input.projectId,
    deviceType: input.deviceType ?? "all",
    range,
    interval,
    selectedMetric: input.selectedMetric ?? "LCP",
    topRoutesLimit: input.topRoutesLimit ?? DEFAULT_TOP_ROUTES_LIMIT,
  };
}
