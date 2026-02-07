import { SortDirection } from "@/app/server/domain/dashboard/overview/types";
import type { DeviceFilter } from "@/app/server/lib/device-types";

export const REGRESSION_METRIC_NAMES = ["LCP", "INP", "CLS", "TTFB"] as const;
export type RegressionMetricName = (typeof REGRESSION_METRIC_NAMES)[number];

export type RegressionsMetricFilter = RegressionMetricName | "all";

export type DateRange = {
  start: Date;
  end: Date;
};

export type RegressionsSortField = "route" | "metric" | "change" | "views";

export type ListRegressionsQuery = {
  projectId: string;
  range: DateRange;
  deviceType: DeviceFilter;
  search?: string;
  metric: RegressionsMetricFilter;
  sort: { field: RegressionsSortField; direction: SortDirection };
  page: { limit: number; offset: number };
};

export type RegressionListItem = {
  route: string;
  metricName: RegressionMetricName;
  previousValue: number;
  currentValue: number;
  change: number;
  views: number;
};

export type RegressionsSummary = {
  baseTotalRegressions: number;
  totalRegressions: number;
  criticalRegressions: number;
  avgDegradationPct: number | null;
};

export type ListRegressionsData = {
  summary: RegressionsSummary;
  items: RegressionListItem[];
};

export type ListRegressionsResult =
  | { kind: "ok"; data: ListRegressionsData }
  | { kind: "project-not-found"; projectId: string };
