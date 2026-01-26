import { IntervalKey, MetricName } from "@/app/server/domain/dashboard/overview/types";
import { sql } from "@/app/server/lib/clickhouse/client";
import type { DeviceFilter } from "@/app/server/lib/device-types";

/**
 * Data source strategy:
 * - Hour interval in fetchAllMetricsSeries: Query raw `cwv_events` table for hourly breakdown
 * - All other queries: Use pre-aggregated `cwv_daily_aggregates` table for performance
 *
 * Quantile indices: [0]=p50, [1]=p75, [2]=p90, [3]=p95, [4]=p99
 */

type SqlFragment = ReturnType<typeof sql<Record<string, unknown>>>;

type BaseFilters = {
  projectId: string;
  start: string; // YYYY-MM-DD for day/week/month, ISO timestamp for hour
  end: string; // YYYY-MM-DD for day/week/month, ISO timestamp for hour
  interval: IntervalKey;
  deviceType: DeviceFilter;
};

/** WHERE clause for cwv_daily_aggregates (date-based filtering) */
function buildDailyWhereClause(filters: BaseFilters, metricName?: MetricName): SqlFragment {
  const where = sql`WHERE project_id = ${filters.projectId} AND event_date BETWEEN toDate(${filters.start}) AND toDate(${filters.end})`;

  if (filters.deviceType !== "all") {
    where.append(sql` AND device_type = ${filters.deviceType}`);
  }

  if (metricName) {
    where.append(sql` AND metric_name = ${metricName}`);
  }

  return where;
}

/** WHERE clause for cwv_events (timestamp-based filtering for hour interval) */
function buildEventsWhereClause(filters: BaseFilters, metricName?: MetricName): SqlFragment {
  const where = sql`WHERE project_id = ${filters.projectId} AND recorded_at >= parseDateTimeBestEffort(${filters.start}) AND recorded_at <= parseDateTimeBestEffort(${filters.end})`;

  if (filters.deviceType !== "all") {
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
  const where = buildDailyWhereClause(filters);

  return sql<MetricsOverviewRow>`
    SELECT metric_name, quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS percentiles, toString(countMerge(sample_size)) AS sample_size
    FROM cwv_daily_aggregates ${where} GROUP BY metric_name
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
  limit: number,
): Promise<WorstRouteRow[]> {
  const where = buildDailyWhereClause(filters, metricName);

  return sql<WorstRouteRow>`
    SELECT route, percentiles, toString(sample_count) AS sample_size FROM (
      SELECT route, quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS percentiles, countMerge(sample_size) AS sample_count
      FROM cwv_daily_aggregates ${where} GROUP BY route
    ) ORDER BY percentiles[1] DESC LIMIT ${limit}
  `;
}

export type MetricSeriesRow = {
  metric_name: MetricName;
  period: string;
  percentiles: number[];
  sample_size: string;
};

export async function fetchAllMetricsSeries(filters: BaseFilters): Promise<MetricSeriesRow[]> {

  if (filters.interval === "hour") {
    const where = buildEventsWhereClause(filters);
    return sql<MetricSeriesRow>`
      SELECT metric_name, toString(toStartOfHour(recorded_at)) AS period, quantiles(0.5, 0.75, 0.9, 0.95, 0.99)(metric_value) AS percentiles, toString(count()) AS sample_size
      FROM cwv_events ${where} GROUP BY metric_name, period ORDER BY metric_name, period ASC
    `;
  }

  const where = buildDailyWhereClause(filters);

  if (filters.interval === "week") {
    return sql<MetricSeriesRow>`
      SELECT metric_name, toString(week_period) AS period, quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS percentiles, toString(countMerge(sample_size)) AS sample_size
      FROM (SELECT metric_name, toStartOfWeek(event_date) AS week_period, quantiles, sample_size FROM cwv_daily_aggregates ${where}) GROUP BY metric_name, week_period ORDER BY metric_name, week_period ASC
    `;
  }

  if (filters.interval === "month") {
    return sql<MetricSeriesRow>`
      SELECT metric_name, toString(month_period) AS period, quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS percentiles, toString(countMerge(sample_size)) AS sample_size
      FROM (SELECT metric_name, toStartOfMonth(event_date) AS month_period, quantiles, sample_size FROM cwv_daily_aggregates ${where}) GROUP BY metric_name, month_period ORDER BY metric_name, month_period ASC
    `;
  }

  return sql<MetricSeriesRow>`
    SELECT metric_name, toString(event_date) AS period, quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS percentiles, toString(countMerge(sample_size)) AS sample_size
    FROM cwv_daily_aggregates ${where} GROUP BY metric_name, event_date ORDER BY metric_name, event_date ASC
  `;
}

export type RouteStatusDistributionRow = {
  status: string;
  route_count: string;
};

export async function fetchRouteStatusDistribution(
  filters: BaseFilters,
  metricName: MetricName,
  thresholds: { good: number; needsImprovement: number },
): Promise<RouteStatusDistributionRow[]> {
  const where = buildDailyWhereClause(filters, metricName);

  return sql<RouteStatusDistributionRow>`
    WITH toFloat64(${thresholds.good}) AS good_threshold, toFloat64(${thresholds.needsImprovement}) AS needs_threshold
    SELECT multiIf(p75 <= good_threshold, 'good', p75 <= needs_threshold, 'needs-improvement', 'poor') AS status, toString(count()) AS route_count
    FROM (SELECT route, quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles)[1] AS p75 FROM cwv_daily_aggregates ${where} GROUP BY route)
    GROUP BY status
  `;
}
