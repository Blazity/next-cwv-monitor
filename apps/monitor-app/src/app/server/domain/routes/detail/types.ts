import type { WebVitalRatingV1 } from 'cwv-monitor-contracts';
import type { DeviceType } from '@/app/server/lib/device-types';

export const ROUTES_DEVICE_TYPES = ['desktop', 'mobile', 'all'] as const;
export type RoutesDeviceType = DeviceType | 'all';

export const METRIC_NAMES = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;
export type MetricName = (typeof METRIC_NAMES)[number];

export type DateRange = {
  start: Date;
  end: Date;
};

export type QuantileSummary = {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
};

export type MetricSummary = {
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

export type StatusDistribution = Record<WebVitalRatingV1, number>;

export type InsightItem = {
  kind: 'success' | 'warning' | 'info';
  message: string;
};

export type GetRouteDetailQuery = {
  projectId: string;
  route: string;
  range: DateRange;
  deviceType: RoutesDeviceType;
  selectedMetric: MetricName;
};

export type RouteDetail = {
  route: string;
  views: number;
  metrics: MetricSummary[];
  selectedMetric: MetricName;
  timeSeries: DailySeriesPoint[];
  distribution: StatusDistribution;
  insights: InsightItem[];
};

export type GetRouteDetailResult =
  | { kind: 'ok'; data: RouteDetail }
  | { kind: 'project-not-found'; projectId: string }
  | { kind: 'route-not-found'; route: string }
  | { kind: 'unsupported-metric'; metricName: string };


