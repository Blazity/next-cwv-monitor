import type { WebVitalRatingV1 } from "cwv-monitor-contracts";
import type { DeviceFilter } from "@/app/server/lib/device-types";
import { DateRange, MetricName, Percentile, QuantileSummary, SortDirection } from "@/app/server/domain/dashboard/overview/types";

export const ROUTES_DEVICE_TYPES = ["desktop", "mobile", "all"] as const;

export type RoutesSortField = "route" | "views" | "metric";


export type ListRoutesQuery = {
  projectId: string;
  range: DateRange;
  deviceType: DeviceFilter;
  search?: string;
  metricName: MetricName;
  percentile: Percentile;
  sort: { field: RoutesSortField; direction: SortDirection };
  page: { limit: number; offset: number };
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
  | { kind: "ok"; data: ListRoutesData }
  | { kind: "project-not-found"; projectId: string }
  | { kind: "unsupported-metric"; metricName: string };
