import { getAuthorizedSession } from "@/lib/auth-utils";
import { formatMetricValue } from "@/lib/utils";
import { getMetricThresholds, getRatingForValue } from "@/app/server/lib/cwv-thresholds";
import { getProjectById } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import {
  fetchRouteMetricDailySeries,
  fetchRouteMetricDistribution,
  fetchRouteMetricsSummary,
  fetchRouteViews,
} from "@/app/server/lib/clickhouse/repositories/dashboard-routes-repository";
import { toQuantileSummary } from "@/app/server/lib/quantiles";
import { CORE_WEB_VITALS } from "@/consts/metrics";

import type { WebVitalRatingV1 } from "cwv-monitor-contracts";
import type {
  GetRouteDetailQuery,
  GetRouteDetailResult,
  InsightItem,
  MetricSummary,
  StatusDistribution,
} from "@/app/server/domain/dashboard/routes/detail/types";
import { DailySeriesPoint } from "@/app/server/domain/dashboard/overview/types";
const LOW_VIEWS_THRESHOLD = 1000;

function emptyStatusDistribution(): StatusDistribution {
  return {
    good: 0,
    "needs-improvement": 0,
    poor: 0,
  };
}

function isRating(value: string | null | undefined): value is WebVitalRatingV1 {
  return value === "good" || value === "needs-improvement" || value === "poor";
}

function buildInsights(views: number, metrics: MetricSummary[]): InsightItem[] {
  const insights: InsightItem[] = [];

  for (const metricName of CORE_WEB_VITALS) {
    const item = metrics.find((m) => m.metricName === metricName);
    const p75 = item?.quantiles?.p75;
    const p99 = item?.quantiles?.p99;

    if (typeof p75 !== "number") continue;

    const p75Formatted = formatMetricValue(metricName, p75);

    const status = item?.status;
    // eslint-disable-next-line unicorn/prefer-switch -- Explicit if/else reads clearer for this ordered classification.
    if (status === "good") {
      insights.push({
        kind: "success",
        message: `${metricName} is performing well (P75 = ${p75Formatted}).`,
      });
    } else if (status === "poor") {
      insights.push({
        kind: "warning",
        message: `${metricName} needs attention (P75 = ${p75Formatted}).`,
      });
    } else if (status === "needs-improvement") {
      insights.push({
        kind: "info",
        message: `${metricName} is close to the "Poor" threshold (P75 = ${p75Formatted}).`,
      });
    }

    if (typeof p99 === "number" && p75 > 0) {
      const ratio = p99 / p75;
      if (ratio > 2) {
        insights.push({
          kind: "info",
          message: `${metricName} shows high variance (P99 is ${ratio.toFixed(1)}× P75). Consider investigating outliers.`,
        });
      }
    }
  }

  if (views > 0 && views < LOW_VIEWS_THRESHOLD) {
    insights.push({
      kind: "warning",
      message: `Low tracked views (${views}). Interpret metrics with caution.`,
    });
  }

  return insights;
}

export class RouteDetailService {
  async getDetail(query: GetRouteDetailQuery): Promise<GetRouteDetailResult> {
    await getAuthorizedSession();

    const project = await getProjectById(query.projectId);
    if (!project) {
      return { kind: "project-not-found", projectId: query.projectId };
    }

    const selectedThresholds = getMetricThresholds(query.selectedMetric);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!selectedThresholds) {
      return { kind: "unsupported-metric", metricName: query.selectedMetric };
    }

    const baseFilters = {
      projectId: query.projectId,
      range: query.range,
      deviceType: query.deviceType,
    } as const;

    const [views, metricsRows, seriesRows, distributionRows] = await Promise.all([
      fetchRouteViews({ ...baseFilters, route: query.route }),
      fetchRouteMetricsSummary({ ...baseFilters, route: query.route }),
      fetchRouteMetricDailySeries({ ...baseFilters, route: query.route, metricName: query.selectedMetric }),
      fetchRouteMetricDistribution({ ...baseFilters, route: query.route, metricName: query.selectedMetric }),
    ]);

    if (views === 0 && metricsRows.length === 0) {
      return { kind: "route-not-found", route: query.route };
    }

    const metrics: MetricSummary[] = metricsRows.map((row) => {
      const quantiles = toQuantileSummary(row.percentiles);
      const p75 = quantiles?.p75;
      const status = typeof p75 === "number" ? getRatingForValue(row.metric_name, p75) : null;

      return {
        metricName: row.metric_name,
        sampleSize: Number(row.sample_size || 0),
        quantiles,
        status,
      };
    });

    const timeSeries: DailySeriesPoint[] = seriesRows.map((row) => {
      const quantiles = toQuantileSummary(row.percentiles);
      const p75 = quantiles?.p75;
      const status = typeof p75 === "number" ? getRatingForValue(query.selectedMetric, p75) : null;

      return {
        date: row.event_date,
        sampleSize: Number(row.sample_size || 0),
        quantiles,
        status,
      };
    });

    const distribution = emptyStatusDistribution();
    for (const row of distributionRows) {
      if (!isRating(row.status)) continue;
      distribution[row.status] = Number(row.session_count || 0);
    }

    const insights = buildInsights(views, metrics);

    return {
      kind: "ok",
      data: {
        route: query.route,
        views,
        metrics,
        selectedMetric: query.selectedMetric,
        timeSeries,
        distribution,
        insights,
      },
    };
  }
}
