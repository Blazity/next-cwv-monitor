import type { WebVitalRatingV1 } from 'cwv-monitor-contracts';
import type { DeviceType } from '@/app/server/lib/device-types';

export const ROUTES_DEVICE_TYPES = ['desktop', 'mobile', 'all'] as const;
export type RoutesDeviceType = DeviceType | 'all';

export const METRIC_NAMES = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;
export type MetricName = (typeof METRIC_NAMES)[number];

export const PERCENTILES = ['p50', 'p75', 'p90', 'p95', 'p99'] as const;
export type Percentile = (typeof PERCENTILES)[number];

export type DateRange = {
  start: Date;
  end: Date;
};

export type RoutesSortField = 'route' | 'views' | 'metric';
export type SortDirection = 'asc' | 'desc';

export type ListRoutesQuery = {
  projectId: string;
  range: DateRange;
  deviceType: RoutesDeviceType;
  search?: string;
  metricName: MetricName;
  percentile: Percentile;
  sort: { field: RoutesSortField; direction: SortDirection };
  page: { limit: number; offset: number };
};

export type QuantileSummary = {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
};

export type RouteListItem = {
  route: string;
  views: number;
  metricSampleSize: number;
  quantiles: QuantileSummary | null;
  metricValue: number | null;
  status: WebVitalRatingV1 | null;
};

export type StatusDistribution = Record<WebVitalRatingV1, number>;

export type ListRoutesData = {
  totalRoutes: number;
  statusDistribution: StatusDistribution;
  items: RouteListItem[];
};

export type ListRoutesResult =
  | { kind: 'ok'; data: ListRoutesData }
  | { kind: 'project-not-found'; projectId: string }
  | { kind: 'unsupported-metric'; metricName: string };


