import { IntervalKey, MetricName, toDateOnlyString } from "@/app/server/domain/dashboard/overview/types";
import { sql } from "@/app/server/lib/clickhouse/client";
import type { DeviceFilter } from "@/app/server/lib/device-types";

/**
 * Data source strategy:
 * - Hour interval in fetchAllMetricsSeries: Query raw `cwv_events` table for hourly breakdown (UTC)
 * - All other queries: Use pre-aggregated `cwv_daily_aggregates` table for performance
 *
 * Timezone handling:
 * - Hourly queries use toStartOfHour(recorded_at, 'UTC') to match client-side UTC hour keys
 * - Weekly queries use toStartOfWeek(event_date, 0) where 0 = Sunday to match client expectations
 *
 * Quantile indices (1-based): [1]=p50, [2]=p75, [3]=p90, [4]=p95, [5]=p99
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
  limit: number,
): Promise<WorstRouteRow[]> {
  const where = buildDailyWhereClause(filters, metricName);

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

export type MetricSeriesRow = {
  metric_name: MetricName;
  period: string;
  percentiles: number[];
  sample_size: string;
};

const INTERVAL_TO_PERIOD_EXPR: Record<IntervalKey, ReturnType<typeof sql.raw>> = {
  hour: sql.raw("toStartOfHour(recorded_at, 'UTC')"),
  day: sql.raw("event_date"),
  week: sql.raw("toStartOfWeek(event_date, 0)"),
  month: sql.raw("toStartOfMonth(event_date)"),
};

const EVENT_INTERVAL_TO_PERIOD_EXPR: Record<IntervalKey, ReturnType<typeof sql.raw>> = {
  hour: sql.raw("toStartOfHour(recorded_at, 'UTC')"),
  day: sql.raw("toDate(recorded_at)"),
  week: sql.raw("toStartOfWeek(toDate(recorded_at), 0)"),
  month: sql.raw("toStartOfMonth(toDate(recorded_at))"),
};

export async function fetchAllMetricsSeries(filters: BaseFilters): Promise<MetricSeriesRow[]> {
  if (filters.interval === "hour") {
    const where = buildEventsWhereClause(filters);
    return sql<MetricSeriesRow>`
      SELECT
        metric_name,
        toString(toStartOfHour(recorded_at, 'UTC')) AS period,
        quantiles(0.5, 0.75, 0.9, 0.95, 0.99)(metric_value) AS percentiles,
        toString(count()) AS sample_size
      FROM cwv_events
      ${where}
      GROUP BY metric_name, period
      ORDER BY metric_name, period ASC
    `;
  }
  
  const periodFunc = INTERVAL_TO_PERIOD_EXPR[filters.interval];
  const eventPeriodFunc = EVENT_INTERVAL_TO_PERIOD_EXPR[filters.interval];

  const deviceFilter = filters.deviceType === "all" 
    ? sql`` 
    : sql` AND device_type = ${filters.deviceType}`;
  
  const startDateString = toDateOnlyString(filters.start);
  const endDateString = toDateOnlyString(filters.end);

  return sql<MetricSeriesRow>`
    SELECT
      metric_name,
      toString(period) AS period,
      quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles_state) AS percentiles,
      toString(countMerge(sample_size_state)) AS sample_size
    FROM (
      SELECT
        metric_name,
        ${periodFunc} AS period,
        quantiles AS quantiles_state,
        sample_size AS sample_size_state
      FROM cwv_daily_aggregates
      WHERE project_id = ${filters.projectId}
        AND event_date >= toDate(${startDateString})
        AND event_date < toDate(${endDateString})
        ${deviceFilter}

      UNION ALL

      SELECT
        metric_name,
        ${eventPeriodFunc} AS period,
        quantilesState(0.5, 0.75, 0.9, 0.95, 0.99)(metric_value) AS quantiles_state,
        countState() AS sample_size_state
      FROM cwv_events
      WHERE project_id = ${filters.projectId}
        AND recorded_at >= toStartOfDay(toDate(${endDateString}))
        AND recorded_at <= parseDateTimeBestEffort(${filters.end})
        ${deviceFilter}
      GROUP BY metric_name, period
    ) AS combined
    GROUP BY metric_name, period
    ORDER BY metric_name, period ASC
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
