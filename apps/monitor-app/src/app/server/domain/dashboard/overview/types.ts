import type { WebVitalRatingV1 } from "cwv-monitor-contracts";
import type { DeviceFilter } from "@/app/server/lib/device-types";

export const OVERVIEW_DEVICE_TYPES = ["desktop", "mobile", "all"] as const;

export const METRIC_NAMES = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;
export type MetricName = (typeof METRIC_NAMES)[number];

export type TimeRange = (typeof TIME_RANGES)[number];
export const TIME_RANGES = [
  { value: "24h", label: "Last 24 hours", days: 1 },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
] as const;
export type TimeRangeKey = (typeof TIME_RANGES)[number]["value"];

export const GRANULARITIES = [
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const;
export type GranularityKey = (typeof GRANULARITIES)[number]["value"];

export const timeRangeToGranularities = {
  "24h": ["hour"],
  "7d": ["hour", "day", "week"],
  "30d": ["day", "week"],
  "90d": ["day", "week", "month"],
} as const satisfies Record<TimeRangeKey, GranularityKey[]>;

export type DateRange = {
  start: Date;
  end: Date;
};

export type SortDirection = "asc" | "desc";

export type GetDashboardOverviewQuery = {
  projectId: string;
  range: DateRange;
  granularity: GranularityKey;
  selectedMetric: MetricName;
  deviceType: DeviceFilter;
  topRoutesLimit: number;
};

export type QuantileSummary = Record<Percentile, number>;

export type MetricOverviewItem = {
  metricName: MetricName;
  sampleSize: number;
  quantiles: QuantileSummary | null;
  status: WebVitalRatingV1 | null;
};

export type DailySeriesPoint = {
  date: string;
  sampleSize: number;
  quantiles: QuantileSummary | null;
};

export type WorstRouteItem = {
  route: string;
  sampleSize: number;
  quantiles: QuantileSummary | null;
  status: WebVitalRatingV1 | null;
};

export type StatusDistribution = Record<WebVitalRatingV1, number>;

export type QuickStatsData = {
  totalViews: number;
  viewTrend: number;
  timeRangeLabel: string;
};

export type DashboardOverview = {
  metricOverview: MetricOverviewItem[];
  timeSeriesByMetric: Record<MetricName, DailySeriesPoint[]>;
  worstRoutes: WorstRouteItem[];
  quickStats: QuickStatsData;
  statusDistribution: StatusDistribution;
};

export type GetDashboardOverviewResult =
  | { kind: "ok"; data: DashboardOverview }
  | { kind: "project-not-found"; projectId: string }
  | { kind: "unsupported-metric"; metricName: string };

export function isMetricName(value: unknown): value is MetricName {
  return typeof value === "string" && METRIC_NAMES.includes(value as MetricName);
}

export function isOverviewDeviceType(value: unknown): value is DeviceFilter {
  return typeof value === "string" && OVERVIEW_DEVICE_TYPES.includes(value as DeviceFilter);
}

export function isTimeRangeKey(value: unknown): value is TimeRangeKey {
  return typeof value === "string" && TIME_RANGES.some((r) => r.value === value);
}

export function parseTimeRange(key: unknown): DateRange {
  const range = TIME_RANGES.find((r) => r.value === key) ?? TIME_RANGES[0];
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - range.days);
  return { start, end };
}

export function getDefaultGranularity(timeRange: TimeRangeKey): GranularityKey {
  return timeRangeToGranularities[timeRange][0];
}

export function isValidGranularityForTimeRange(granularity: GranularityKey, timeRange: TimeRangeKey): boolean {
  const validGranularities: readonly GranularityKey[] = timeRangeToGranularities[timeRange];
  return validGranularities.includes(granularity);
}

/**
 * Returns the effective granularity for a given time range.
 * If the provided granularity is valid for the time range, it is returned.
 * Otherwise, the default granularity for the time range is returned.
 */
export function getEffectiveGranularity(
  granularity: GranularityKey | string | null | undefined,
  timeRange: TimeRangeKey,
): GranularityKey {
  return granularity && isValidGranularityForTimeRange(granularity as GranularityKey, timeRange)
    ? (granularity as GranularityKey)
    : getDefaultGranularity(timeRange);
}

export const PERCENTILES = ["p50", "p75", "p90", "p95", "p99"] as const;
export type Percentile = (typeof PERCENTILES)[number];
