import type { Percentile } from "@/app/server/domain/dashboard/overview/types";

export { METRIC_DETAILS } from "@/consts/metric-details";

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
