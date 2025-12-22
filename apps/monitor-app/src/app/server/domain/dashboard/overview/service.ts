import { getProjectById } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import {
  fetchMetricsOverview,
  fetchAllMetricsDailySeries,
  fetchRouteStatusDistribution,
  fetchWorstRoutes
} from '@/app/server/lib/clickhouse/repositories/dashboard-overview-repository';
import { getMetricThresholds, getRatingForValue } from '@/app/server/lib/cwv-thresholds';
import type { WebVitalRatingV1 } from 'cwv-monitor-contracts';

import type {
  DashboardOverview,
  DailySeriesPoint,
  GetDashboardOverviewQuery,
  GetDashboardOverviewResult,
  MetricName,
  MetricOverviewItem,
  QuantileSummary,
  StatusDistribution,
  WorstRouteItem
} from '@/app/server/domain/dashboard/overview/types';

function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toQuantileSummary(values: number[] | undefined): QuantileSummary | null {
  if (!values || values.length < 5) return null;
  return {
    p50: values[0],
    p75: values[1],
    p90: values[2],
    p95: values[3],
    p99: values[4]
  };
}

function emptyStatusDistribution(): StatusDistribution {
  return {
    good: 0,
    'needs-improvement': 0,
    poor: 0
  };
}

function isRating(value: string | null | undefined): value is WebVitalRatingV1 {
  return value === 'good' || value === 'needs-improvement' || value === 'poor';
}

export class DashboardOverviewService {
  async getOverview(query: GetDashboardOverviewQuery): Promise<GetDashboardOverviewResult> {
    const project = await getProjectById(query.projectId);
    if (!project) {
      return { kind: 'project-not-found', projectId: query.projectId };
    }

    const selectedThresholds = getMetricThresholds(query.selectedMetric);
    if (!selectedThresholds) {
      return { kind: 'unsupported-metric', metricName: query.selectedMetric };
    }

    const filters = {
      projectId: query.projectId,
      start: toDateOnlyString(query.range.start),
      end: toDateOnlyString(query.range.end),
      deviceType: query.deviceType
    } as const;

    // Fetch all metrics time series in a single query
    const [metricsRows, worstRouteRows, distributionRows, allMetricsSeriesRows] = await Promise.all([
      fetchMetricsOverview(filters),
      fetchWorstRoutes(filters, query.selectedMetric, query.topRoutesLimit),
      fetchRouteStatusDistribution(filters, query.selectedMetric, selectedThresholds),
      fetchAllMetricsDailySeries(filters)
    ]);

    const metricOverview: MetricOverviewItem[] = metricsRows.map((row) => {
      const quantiles = toQuantileSummary(row.percentiles);
      const p75 = quantiles?.p75;
      const status = typeof p75 === 'number' ? getRatingForValue(row.metric_name, p75) : null;
      return {
        metricName: row.metric_name,
        sampleSize: Number(row.sample_size || 0),
        quantiles,
        status
      };
    });

    // Build time series map for all metrics
    const timeSeriesByMetric: Record<MetricName, DailySeriesPoint[]> = {} as Record<MetricName, DailySeriesPoint[]>;

    for (const row of allMetricsSeriesRows) {
      const metric = row.metric_name as MetricName;
      const quantiles = toQuantileSummary(row.percentiles);
      const p75 = quantiles?.p75;
      const status = typeof p75 === 'number' ? getRatingForValue(metric, p75) : null;

      timeSeriesByMetric[metric].push({
        date: row.event_date,
        sampleSize: Number(row.sample_size || 0),
        quantiles,
        status
      });
    }

    const worstRoutes: WorstRouteItem[] = worstRouteRows.map((row) => {
      const quantiles = toQuantileSummary(row.percentiles);
      const p75 = quantiles?.p75;
      const status = typeof p75 === 'number' ? getRatingForValue(query.selectedMetric, p75) : null;
      return {
        route: row.route,
        sampleSize: Number(row.sample_size || 0),
        quantiles,
        status
      };
    });

    const statusDistribution = emptyStatusDistribution();
    for (const row of distributionRows) {
      if (!isRating(row.status)) continue;
      statusDistribution[row.status] = Number(row.route_count || 0);
    }

    return {
      kind: 'ok',
      data: mapDashboardOverview(metricOverview, timeSeriesByMetric, worstRoutes, statusDistribution)
    };
  }
}

function mapDashboardOverview(
  metricOverview: MetricOverviewItem[],
  timeSeriesByMetric: Record<MetricName, DailySeriesPoint[]>,
  worstRoutes: WorstRouteItem[],
  statusDistribution: StatusDistribution
): DashboardOverview {
  return {
    metricOverview,
    timeSeriesByMetric,
    worstRoutes,
    statusDistribution
  };
}
