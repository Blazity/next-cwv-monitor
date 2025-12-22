import type { WebVitalRatingV1 } from 'cwv-monitor-contracts';
import type { DeviceType } from '@/app/server/lib/device-types';

export const OVERVIEW_DEVICE_TYPES = ['desktop', 'mobile', 'all'] as const;
export type OverviewDeviceType = DeviceType | 'all';

export const METRIC_NAMES = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;
export type MetricName = (typeof METRIC_NAMES)[number];

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
  metricName: string;
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

export type DashboardOverview = {
  metricOverview: MetricOverviewItem[];
  timeSeries: DailySeriesPoint[];
  worstRoutes: WorstRouteItem[];
  statusDistribution: StatusDistribution;
};

export type GetDashboardOverviewResult =
  | { kind: 'ok'; data: DashboardOverview }
  | { kind: 'project-not-found'; projectId: string }
  | { kind: 'unsupported-metric'; metricName: string };
