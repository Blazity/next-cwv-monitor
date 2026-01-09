import type { MetricName } from "@/app/server/domain/dashboard/overview/types";

export const METRIC_DETAILS = {
  LCP: "Largest Contentful Paint",
  INP: "Interaction to Next Paint",
  CLS: "Cumulative Layout Shift",
  FCP: "First Contentful Paint",
  TTFB: "Time to First Byte",
} as const satisfies Record<MetricName, string>;
