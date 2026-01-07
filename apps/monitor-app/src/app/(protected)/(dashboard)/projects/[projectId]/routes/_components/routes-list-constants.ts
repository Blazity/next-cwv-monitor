import type { MetricName } from "@/app/server/domain/routes/list/types";
import type { Percentile } from "@/app/server/domain/dashboard/overview/types";

export const METRIC_DETAILS: Record<MetricName, string> = {
  LCP: "Largest Contentful Paint",
  INP: "Interaction to Next Paint",
  CLS: "Cumulative Layout Shift",
  FCP: "First Contentful Paint",
  TTFB: "Time to First Byte",
};

export const PERCENTILE_LABELS: Record<Percentile, string> = {
  p50: "P50",
  p75: "P75",
  p90: "P90",
  p95: "P95",
  p99: "P99",
};

export function getPercentileLabel(percentile: Percentile): string {
  return PERCENTILE_LABELS[percentile];
}
