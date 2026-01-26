import { getProjectById } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import {
  fetchMetricsOverview,
  fetchAllMetricsSeries,
  fetchRouteStatusDistribution,
  fetchWorstRoutes,
} from "@/app/server/lib/clickhouse/repositories/dashboard-overview-repository";
import { getMetricThresholds, getRatingForValue } from "@/app/server/lib/cwv-thresholds";
import { toQuantileSummary } from "@/app/server/lib/quantiles";
import type { WebVitalRatingV1 } from "cwv-monitor-contracts";
import { ArkErrors } from "arktype";

import {
  type DashboardOverview,
  type DailySeriesPoint,
  type GetDashboardOverviewQuery,
  type GetDashboardOverviewResult,
  type MetricOverviewItem,
  type StatusDistribution,
  type WorstRouteItem,
  METRIC_NAMES,
  QuickStatsData,
  MetricName,
} from "@/app/server/domain/dashboard/overview/types";
import { projectIdSchema } from "@/app/server/domain/projects/schema";

function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isMetricName(value: string): value is MetricName {
  return METRIC_NAMES.includes(value as MetricName);
}

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

function getPreviousPeriod(start: Date, end: Date): { start: Date; end: Date } {
  const duration = end.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - duration),
    end: new Date(end.getTime() - duration),
  };
}

export class DashboardOverviewService {
  async getOverview(query: GetDashboardOverviewQuery): Promise<GetDashboardOverviewResult> {
    const validatedProjectId = projectIdSchema(query.projectId);
    if (validatedProjectId instanceof ArkErrors) {
      return { kind: "project-not-found", projectId: query.projectId };
    }

    const project = await getProjectById(query.projectId);
    if (!project) {
      return { kind: "project-not-found", projectId: query.projectId };
    }

    const selectedThresholds = getMetricThresholds(query.selectedMetric);

    // Filters for daily-aggregated queries (Metrics Overview, Worst Routes, Status Distribution)
    // always use date-only strings (YYYY-MM-DD) compatible with cwv_daily_aggregates
    const filters = {
      projectId: query.projectId,
      start: toDateOnlyString(query.range.start),
      end: toDateOnlyString(query.range.end),
      interval: query.interval,
      deviceType: query.deviceType,
    } as const;

    // Filters for Time Series Chart
    // For hour interval, use ISO timestamps for precise filtering on cwv_events
    // For other intervals, use date-only strings
    const toSeriesFilterString = query.interval === "hour"
      ? (date: Date) => date.toISOString()
      : toDateOnlyString;

    const seriesFilters = {
      ...filters,
      start: toSeriesFilterString(query.range.start),
      end: toSeriesFilterString(query.range.end),
    };

    const previousRange = getPreviousPeriod(query.range.start, query.range.end);
    const previousFilters = {
      ...filters,
      start: toDateOnlyString(previousRange.start),
      end: toDateOnlyString(previousRange.end),
    };

    const [metricsRows, worstRouteRows, previousMetricsRows, distributionRows, allMetricsSeriesRows] =
      await Promise.all([
        fetchMetricsOverview(filters),
        fetchWorstRoutes(filters, query.selectedMetric, query.topRoutesLimit),
        fetchMetricsOverview(previousFilters),
        fetchRouteStatusDistribution(filters, query.selectedMetric, selectedThresholds),
        fetchAllMetricsSeries(seriesFilters),
      ]);

    const metricOverview: MetricOverviewItem[] = metricsRows.map((row) => {
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

    const timeSeriesByMetric = new Map(METRIC_NAMES.map((metric) => [metric, [] as DailySeriesPoint[]]));

    for (const row of allMetricsSeriesRows) {
      const metric = row.metric_name;

      if (!isMetricName(metric)) continue;

      const quantiles = toQuantileSummary(row.percentiles);

      timeSeriesByMetric.get(metric)?.push({
        date: row.period,
        sampleSize: Number(row.sample_size || 0),
        quantiles,
      });
    }

    const worstRoutes: WorstRouteItem[] = worstRouteRows.map((row) => {
      const quantiles = toQuantileSummary(row.percentiles);
      const p75 = quantiles?.p75;
      const status = typeof p75 === "number" ? getRatingForValue(query.selectedMetric, p75) : null;
      return {
        route: row.route,
        sampleSize: Number(row.sample_size || 0),
        quantiles,
        status,
      };
    });

    const statusDistribution = emptyStatusDistribution();
    for (const row of distributionRows) {
      if (!isRating(row.status)) continue;
      statusDistribution[row.status] = Number(row.route_count || 0);
    }

    const lcpRow = metricsRows.find((r) => r.metric_name === "LCP");
    const prevLcpRow = previousMetricsRows.find((r) => r.metric_name === "LCP");

    const currentTotalViews = Number(lcpRow?.sample_size || 0);
    const previousTotalViews = Number(prevLcpRow?.sample_size || 0);

    let viewTrend = 0;
    if (previousTotalViews > 0) {
      viewTrend = Math.round(((currentTotalViews - previousTotalViews) / previousTotalViews) * 100);
    }

    const timeSeriesByMetricRecord = Object.fromEntries(timeSeriesByMetric.entries()) as Record<
      MetricName,
      DailySeriesPoint[]
    >;

    const quickStats: QuickStatsData = {
      totalViews: currentTotalViews,
      viewTrend: viewTrend,
      timeRangeLabel: `${Math.ceil((query.range.end.getTime() - query.range.start.getTime()) / (1000 * 60 * 60 * 24))} Days`,
    };

    return {
      kind: "ok",
      data: mapDashboardOverview(metricOverview, timeSeriesByMetricRecord, worstRoutes, statusDistribution, quickStats),
    };
  }
}

function mapDashboardOverview(
  metricOverview: MetricOverviewItem[],
  timeSeriesByMetric: Record<MetricName, DailySeriesPoint[]>,
  worstRoutes: WorstRouteItem[],
  statusDistribution: StatusDistribution,
  quickStats: QuickStatsData,
): DashboardOverview {
  return {
    metricOverview,
    timeSeriesByMetric,
    worstRoutes,
    statusDistribution,
    quickStats,
  };
}
