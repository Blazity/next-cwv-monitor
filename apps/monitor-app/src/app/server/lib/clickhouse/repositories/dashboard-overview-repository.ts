import { sql } from '@/app/server/lib/clickhouse/client';
import type { DeviceType } from '@/app/server/lib/device-types';

export type OverviewDeviceFilter = DeviceType | 'all';
export type MetricName = 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';

type SqlFragment = ReturnType<typeof sql<Record<string, unknown>>>;

type BaseFilters = {
  projectId: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  deviceType: OverviewDeviceFilter;
};

function buildWhereClause(filters: BaseFilters, metricName?: MetricName): SqlFragment {
  const where = sql`
    WHERE project_id = ${filters.projectId}
      AND event_date BETWEEN toDate(${filters.start}) AND toDate(${filters.end})
  `;

  if (filters.deviceType !== 'all') {
    where.append(sql` AND device_type = ${filters.deviceType}`);
  }

  if (metricName) {
    where.append(sql` AND metric_name = ${metricName}`);
  }

  return where;
}

export type MetricsOverviewRow = {
  metric_name: MetricName;
  percentiles: number[];
  sample_size: string;
};

export async function fetchMetricsOverview(filters: BaseFilters): Promise<MetricsOverviewRow[]> {
  const where = buildWhereClause(filters);

  return sql<MetricsOverviewRow>`
    SELECT 
      metric_name,
      quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS percentiles,
      toString(countMerge(sample_size)) AS sample_size
    FROM cwv_daily_aggregates
    ${where}
    GROUP BY metric_name
  `;
}

export type WorstRouteRow = {
  route: string;
  percentiles: number[];
  sample_size: string;
};

export async function fetchWorstRoutes(
  filters: BaseFilters,
  metricName: MetricName,
  limit: number
): Promise<WorstRouteRow[]> {
  const where = buildWhereClause(filters, metricName);

  return sql<WorstRouteRow>`
    SELECT
      route,
      percentiles,
      toString(sample_count) AS sample_size
    FROM (
      SELECT
        route,
        quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS percentiles,
        countMerge(sample_size) AS sample_count
      FROM cwv_daily_aggregates
      ${where}
      GROUP BY route
    )
    ORDER BY percentiles[2] DESC
    LIMIT ${limit}
  `;
}

export type MetricDailySeriesRow = {
  metric_name: string;
  event_date: string;
  percentiles: number[];
  sample_size: string;
};

export async function fetchMetricDailySeries(
  filters: BaseFilters,
  metricName: MetricName
): Promise<Omit<MetricDailySeriesRow, 'metric_name'>[]> {
  const where = buildWhereClause(filters, metricName);

  return sql<Omit<MetricDailySeriesRow, 'metric_name'>>`
    SELECT
      event_date,
      quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS percentiles,
      toString(countMerge(sample_size)) AS sample_size
    FROM cwv_daily_aggregates
    ${where}
    GROUP BY event_date
    ORDER BY event_date ASC
  `;
}

export async function fetchAllMetricsDailySeries(filters: BaseFilters): Promise<MetricDailySeriesRow[]> {
  const where = buildWhereClause(filters);

  return sql<MetricDailySeriesRow>`
    SELECT
      metric_name,
      event_date,
      quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS percentiles,
      toString(countMerge(sample_size)) AS sample_size
    FROM cwv_daily_aggregates
    ${where}
    GROUP BY metric_name, event_date
    ORDER BY metric_name, event_date ASC
  `;
}

export type RouteStatusDistributionRow = {
  status: string;
  route_count: string;
};

export async function fetchRouteStatusDistribution(
  filters: BaseFilters,
  metricName: MetricName,
  thresholds: { good: number; needsImprovement: number }
): Promise<RouteStatusDistributionRow[]> {
  const where = buildWhereClause(filters, metricName);

  return sql<RouteStatusDistributionRow>`
    WITH
      toFloat64(${thresholds.good}) AS good_threshold,
      toFloat64(${thresholds.needsImprovement}) AS needs_threshold

    SELECT
      multiIf(p75 <= good_threshold, 'good', p75 <= needs_threshold, 'needs-improvement', 'poor') AS status,
      toString(count()) AS route_count
    FROM (
      SELECT
        route,
        quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles)[2] AS p75
      FROM cwv_daily_aggregates
      ${where}
      GROUP BY route
    )
    GROUP BY status
  `;
}
