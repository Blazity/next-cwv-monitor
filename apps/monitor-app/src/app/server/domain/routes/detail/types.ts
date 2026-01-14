import type { WebVitalRatingV1 } from "cwv-monitor-contracts";
import { DailySeriesPoint, DateRange, MetricName, QuantileSummary } from "@/app/server/domain/dashboard/overview/types";
import { RoutesDeviceType } from "@/app/server/domain/routes/list/types";

export type MetricSummary = {
  metricName: string;
  sampleSize: number;
  quantiles: QuantileSummary | null;
  status: WebVitalRatingV1 | null;
};

export type StatusDistribution = Record<WebVitalRatingV1, number>;

export type InsightItem = {
  kind: "success" | "warning" | "info";
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
  | { kind: "ok"; data: RouteDetail }
  | { kind: "project-not-found"; projectId: string }
  | { kind: "route-not-found"; route: string }
  | { kind: "unsupported-metric"; metricName: string };
