import type { MetricName } from "@/app/server/domain/dashboard/overview/types";

export const CORE_WEB_VITALS = ["LCP", "INP", "CLS"] as const satisfies readonly MetricName[];

export const OTHER_METRICS = ["FCP", "TTFB"] as const satisfies readonly MetricName[];
