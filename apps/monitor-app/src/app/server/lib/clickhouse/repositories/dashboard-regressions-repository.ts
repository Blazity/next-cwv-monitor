import { PAGE_VIEW_EVENT_NAME, SortDirection } from "@/app/server/domain/dashboard/overview/types";
import { RegressionMetricName, RegressionsMetricFilter, RegressionsSortField } from "@/app/server/domain/dashboard/regressions/list/types";
import { sql } from "@/app/server/lib/clickhouse/client";
import type { DeviceFilter } from "@/app/server/lib/device-types";

type SqlFragment = ReturnType<typeof sql<Record<string, unknown>>>;

type DateRange = {
  start: Date;
  end: Date;
};

type BaseFilters = {
  projectId: string;
  deviceType: DeviceFilter;
};

type PeriodFilters = BaseFilters & {
  range: DateRange;
  metric: RegressionsMetricFilter;
  search?: string;
};

const REGRESSION_METRICS = ["LCP", "INP", "CLS", "TTFB"] as const satisfies RegressionMetricName[];

function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfDayUtc(date: Date): Date {
  return new Date(`${toDateOnlyString(date)}T00:00:00.000Z`);
}

function endExclusiveUtc(date: Date): Date {
  const base = new Date(`${toDateOnlyString(date)}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + 1);
  return base;
}

function buildRecordedAtBounds(range: DateRange): { start: Date; endExclusive: Date } {
  return {
    start: startOfDayUtc(range.start),
    endExclusive: endExclusiveUtc(range.end),
  };
}

function buildDailyAggregatesWhereClause(filters: PeriodFilters, start: string, end: string): SqlFragment {
  const where = sql`
    WHERE project_id = ${filters.projectId}
      AND event_date BETWEEN toDate(${start}) AND toDate(${end})
  `;

  if (filters.deviceType !== "all") {
    where.append(sql` AND device_type = ${filters.deviceType}`);
  }

  const metrics = filters.metric === "all" ? REGRESSION_METRICS : ([filters.metric] as const);
  where.append(sql` AND (`);
  let isFirst = true;
  for (const metric of metrics) {
    if (!isFirst) {
      where.append(sql` OR `);
    }
    where.append(sql` metric_name = ${metric}`);
    isFirst = false;
  }
  where.append(sql`)`);

  if (filters.search) {
    where.append(sql` AND positionCaseInsensitive(route, ${filters.search}) > 0`);
  }

  return where;
}

function buildPageViewsWhereClause(filters: PeriodFilters): SqlFragment {
  const { start, endExclusive } = buildRecordedAtBounds(filters.range);
  const where = sql`
    WHERE project_id = ${filters.projectId}
      AND recorded_at >= ${start}
      AND recorded_at < ${endExclusive}
      AND event_name = ${PAGE_VIEW_EVENT_NAME}
  `;

  if (filters.deviceType !== "all") {
    where.append(sql` AND device_type = ${filters.deviceType}`);
  }

  if (filters.search) {
    where.append(sql` AND positionCaseInsensitive(route, ${filters.search}) > 0`);
  }

  return where;
}

export type RegressionsListPageQuery = BaseFilters & {
  currentRange: DateRange;
  previousRange: DateRange;
  search?: string;
  metric: RegressionsMetricFilter;
  sort: { field: RegressionsSortField; direction: SortDirection };
  limit: number;
  offset: number;
};

export type RegressionsListRow = {
  route: string;
  metric_name: RegressionMetricName;
  previous_value: number;
  current_value: number;
  change: number;
  views: string;
};

export async function fetchRegressionsListPage(query: RegressionsListPageQuery): Promise<RegressionsListRow[]> {
  const currentStart = toDateOnlyString(query.currentRange.start);
  const currentEnd = toDateOnlyString(query.currentRange.end);
  const previousStart = toDateOnlyString(query.previousRange.start);
  const previousEnd = toDateOnlyString(query.previousRange.end);

  const filters = {
    projectId: query.projectId,
    deviceType: query.deviceType,
    range: query.currentRange,
    metric: query.metric,
    search: query.search,
  } as const;

  const currentWhere = buildDailyAggregatesWhereClause(filters, currentStart, currentEnd);
  const previousWhere = buildDailyAggregatesWhereClause(filters, previousStart, previousEnd);
  const viewsWhere = buildPageViewsWhereClause(filters);

  const q = sql<RegressionsListRow>`
    WITH
      regressions AS (
        SELECT
          cur.route AS route,
          cur.metric_name AS metric_name,
          prev.metric_value AS previous_value,
          cur.metric_value AS current_value,
          (cur.metric_value - prev.metric_value) AS change
        FROM (
          SELECT
            route,
            metric_name,
            quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles)[2] AS metric_value
          FROM cwv_daily_aggregates
          ${currentWhere}
          GROUP BY route, metric_name
        ) cur
        INNER JOIN (
          SELECT
            route,
            metric_name,
            quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles)[2] AS metric_value
          FROM cwv_daily_aggregates
          ${previousWhere}
          GROUP BY route, metric_name
        ) prev
        USING (route, metric_name)
        WHERE cur.metric_value > prev.metric_value
      ),
      routes_with_regressions AS (
        SELECT DISTINCT route
        FROM regressions
      ),
      views AS (
        SELECT
          route,
          countDistinct(session_id) AS views
        FROM custom_events
        ${viewsWhere}
          AND route IN (SELECT route FROM routes_with_regressions)
        GROUP BY route
      )

    SELECT
      regressions.route AS route,
      regressions.metric_name AS metric_name,
      regressions.previous_value AS previous_value,
      regressions.current_value AS current_value,
      regressions.change AS change,
      toString(ifNull(views.views, 0)) AS views
    FROM regressions
    LEFT JOIN views USING (route)
  `;

  switch (query.sort.field) {
    case "route": {
      q.append(
        query.sort.direction === "asc"
          ? sql` ORDER BY route ASC, metric_name ASC`
          : sql` ORDER BY route DESC, metric_name ASC`,
      );
      break;
    }
    case "metric": {
      q.append(
        query.sort.direction === "asc"
          ? sql` ORDER BY metric_name ASC, route ASC`
          : sql` ORDER BY metric_name DESC, route ASC`,
      );
      break;
    }
    case "views": {
      q.append(
        query.sort.direction === "asc"
          ? sql` ORDER BY ifNull(views.views, 0) ASC, change DESC, route ASC`
          : sql` ORDER BY ifNull(views.views, 0) DESC, change DESC, route ASC`,
      );
      break;
    }
    case "change": {
      q.append(
        query.sort.direction === "asc"
          ? sql` ORDER BY change ASC, ifNull(views.views, 0) DESC, route ASC`
          : sql` ORDER BY change DESC, ifNull(views.views, 0) DESC, route ASC`,
      );
      break;
    }
  }

  q.append(sql` LIMIT ${query.limit} OFFSET ${query.offset}`);
  return q;
}

export type RegressionsSummaryQuery = BaseFilters & {
  currentRange: DateRange;
  previousRange: DateRange;
  search?: string;
  metric: RegressionsMetricFilter;
  criticalThresholds: Record<RegressionMetricName, number>;
};

export type RegressionsSummaryRow = {
  base_total_regressions: string;
  total_regressions: string;
  critical_regressions: string;
  avg_degradation_pct: number | null;
};

export async function fetchRegressionsSummary(query: RegressionsSummaryQuery): Promise<RegressionsSummaryRow> {
  const currentStart = toDateOnlyString(query.currentRange.start);
  const currentEnd = toDateOnlyString(query.currentRange.end);
  const previousStart = toDateOnlyString(query.previousRange.start);
  const previousEnd = toDateOnlyString(query.previousRange.end);

  const filters = {
    projectId: query.projectId,
    deviceType: query.deviceType,
    range: query.currentRange,
    metric: query.metric,
    search: query.search,
  } as const;

  const currentWhere = buildDailyAggregatesWhereClause({ ...filters, search: undefined }, currentStart, currentEnd);
  const previousWhere = buildDailyAggregatesWhereClause({ ...filters, search: undefined }, previousStart, previousEnd);

  const predicate = sql`1`;
  if (query.metric !== "all") {
    predicate.append(sql` AND metric_name = ${query.metric}`);
  }
  if (query.search) {
    predicate.append(sql` AND positionCaseInsensitive(route, ${query.search}) > 0`);
  }

  const isCritical = sql`
    multiIf(
      metric_name = 'LCP', current_value > toFloat64(${query.criticalThresholds.LCP}),
      metric_name = 'INP', current_value > toFloat64(${query.criticalThresholds.INP}),
      metric_name = 'CLS', current_value > toFloat64(${query.criticalThresholds.CLS}),
      metric_name = 'TTFB', current_value > toFloat64(${query.criticalThresholds.TTFB}),
      0
    )
  `;

  const rows = await sql<RegressionsSummaryRow>`
    WITH
      regressions AS (
        SELECT
          cur.route AS route,
          cur.metric_name AS metric_name,
          prev.metric_value AS previous_value,
          cur.metric_value AS current_value,
          (cur.metric_value - prev.metric_value) AS change
        FROM (
          SELECT
            route,
            metric_name,
            quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles)[2] AS metric_value
          FROM cwv_daily_aggregates
          ${currentWhere}
          GROUP BY route, metric_name
        ) cur
        INNER JOIN (
          SELECT
            route,
            metric_name,
            quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles)[2] AS metric_value
          FROM cwv_daily_aggregates
          ${previousWhere}
          GROUP BY route, metric_name
        ) prev
        USING (route, metric_name)
        WHERE cur.metric_value > prev.metric_value
      )

    SELECT
      toString(count()) AS base_total_regressions,
      toString(countIf(${predicate})) AS total_regressions,
      toString(countIf((${predicate}) AND ${isCritical})) AS critical_regressions,
      avgIf(((change / previous_value) * 100), (${predicate}) AND previous_value > 0) AS avg_degradation_pct
    FROM regressions
  `;

  return (
    rows[0] ?? {
      base_total_regressions: "0",
      total_regressions: "0",
      critical_regressions: "0",
      avg_degradation_pct: null,
    }
  );
}
