import type { WebVitalRatingV1 } from 'cwv-monitor-contracts';
import type { DeviceType } from '@/app/server/lib/device-types';

export const OVERVIEW_DEVICE_TYPES = ['desktop', 'mobile', 'all'] as const;
export type OverviewDeviceType = DeviceType | 'all';

export const METRIC_NAMES = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;
export type MetricName = (typeof METRIC_NAMES)[number];

export type TimeRange = (typeof TIME_RANGES)[number];
export const TIME_RANGES = [
  { value: '1d', label: 'Last 24 hours', days: 1 },
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 }
] as const;
export type TimeRangeKey = (typeof TIME_RANGES)[number]['value'];

export type DateRange = {
  start: Date;
  end: Date;
};

export type GetDashboardOverviewQuery = {
  projectId: string;
  range: DateRange;
  selectedMetric: MetricName;
  deviceType: OverviewDeviceType;
  topRoutesLimit: number;
};

export type QuantileSummary = {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
};

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
  status: WebVitalRatingV1 | null;
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
  | { kind: 'ok'; data: DashboardOverview }
  | { kind: 'project-not-found'; projectId: string }
  | { kind: 'unsupported-metric'; metricName: string };

export function isMetricName(value: unknown): value is MetricName {
  return typeof value === 'string' && METRIC_NAMES.includes(value as MetricName);
}

export function isOverviewDeviceType(value: unknown): value is OverviewDeviceType {
  return typeof value === 'string' && OVERVIEW_DEVICE_TYPES.includes(value as OverviewDeviceType);
}

export function isTimeRangeKey(value: unknown): value is TimeRangeKey {
  return typeof value === 'string' && TIME_RANGES.some((r) => r.value === value);
}

export function parseTimeRange(key: unknown): DateRange {
  const range = TIME_RANGES.find((r) => r.value === key) ?? TIME_RANGES[0];
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - range.days);
  return { start, end };
}
