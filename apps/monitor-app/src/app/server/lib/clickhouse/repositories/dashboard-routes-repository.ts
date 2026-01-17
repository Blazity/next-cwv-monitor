import { DateRange, MetricName, SortDirection } from "@/app/server/domain/dashboard/overview/types";
import { Percentile } from "@/app/server/domain/dashboard/overview/types";
import { sql } from "@/app/server/lib/clickhouse/client";
import { DeviceFilter } from "@/app/server/lib/device-types";

export type SortField = "route" | "views" | "metric";

type SqlFragment = ReturnType<typeof sql<Record<string, unknown>>>;

type BaseFilters = {
  projectId: string;
  range: DateRange;
  deviceType: DeviceFilter;
};

const PAGE_VIEW_EVENT_NAME = "$page_view";

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

function buildPageViewsWhereClause(filters: BaseFilters, search?: string): SqlFragment {
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

  if (search) {
    where.append(sql` AND positionCaseInsensitive(route, ${search}) > 0`);
  }

  return where;
}

function buildCustomEventsWhereClause(filters: BaseFilters, eventNames: string[], route?: string): SqlFragment {
  const { start, endExclusive } = buildRecordedAtBounds(filters.range);
  const where = sql`
    WHERE project_id = ${filters.projectId}
      AND recorded_at >= ${start}
      AND recorded_at < ${endExclusive}
  `;

  if (eventNames.length > 0) {
    where.append(sql` AND (`);
    let isFirst = true;
    for (const name of eventNames) {
      if (!isFirst) {
        where.append(sql` OR `);
      }
      where.append(sql` event_name = ${name}`);
      isFirst = false;
    }
    where.append(sql`)`);
  }

  if (filters.deviceType !== "all") {
    where.append(sql` AND device_type = ${filters.deviceType}`);
  }

  if (route) {
    where.append(sql` AND route = ${route}`);
  }

  return where;
}

function buildDailyAggregatesWhereClause(
  filters: BaseFilters,
  metricName: MetricName,
  route?: string,
  search?: string,
): SqlFragment {
  const start = toDateOnlyString(filters.range.start);
  const end = toDateOnlyString(filters.range.end);
  const where = sql`
    WHERE project_id = ${filters.projectId}
      AND event_date BETWEEN toDate(${start}) AND toDate(${end})
      AND metric_name = ${metricName}
  `;

  if (filters.deviceType !== "all") {
    where.append(sql` AND device_type = ${filters.deviceType}`);
  }

  if (route) {
    where.append(sql` AND route = ${route}`);
  }

  if (search) {
    where.append(sql` AND positionCaseInsensitive(route, ${search}) > 0`);
  }

  return where;
}

function buildDailyAggregatesBaseWhereClause(filters: BaseFilters, search?: string): SqlFragment {
  const start = toDateOnlyString(filters.range.start);
  const end = toDateOnlyString(filters.range.end);
  const where = sql`
    WHERE project_id = ${filters.projectId}
      AND event_date BETWEEN toDate(${start}) AND toDate(${end})
  `;

  if (filters.deviceType !== "all") {
    where.append(sql` AND device_type = ${filters.deviceType}`);
  }

  if (search) {
    where.append(sql` AND positionCaseInsensitive(route, ${search}) > 0`);
  }

  return where;
}

function buildCwvEventsWhereClause(filters: BaseFilters, metricName: MetricName, route: string): SqlFragment {
  const { start, endExclusive } = buildRecordedAtBounds(filters.range);
  const where = sql`
    WHERE project_id = ${filters.projectId}
      AND route = ${route}
      AND metric_name = ${metricName}
      AND recorded_at >= ${start}
      AND recorded_at < ${endExclusive}
  `;

  if (filters.deviceType !== "all") {
    where.append(sql` AND device_type = ${filters.deviceType}`);
  }

  return where;
}

function percentileIndex(percentile: Percentile): number {
  switch (percentile) {
    case "p50": {
      return 1;
    }
    case "p75": {
      return 2;
    }
    case "p90": {
      return 3;
    }
    case "p95": {
      return 4;
    }
    case "p99": {
      return 5;
    }
  }
}

export type RoutesListPageQuery = BaseFilters & {
  search?: string;
  metricName: MetricName;
  percentile: Percentile;
  sort: { field: SortField; direction: SortDirection };
  limit: number;
  offset: number;
};

export type RoutesListRow = {
  route: string;
  views: string;
  metric_sample_size: string;
  percentiles: number[];
  metric_value: number | null;
};

export async function fetchRoutesListPage(query: RoutesListPageQuery): Promise<RoutesListRow[]> {
  const viewsWhere = buildPageViewsWhereClause(query, query.search);
  const routesWhere = buildDailyAggregatesBaseWhereClause(query, query.search);
  const aggregatesWhere = buildDailyAggregatesWhereClause(query, query.metricName, undefined, query.search);
  const idx = percentileIndex(query.percentile);

  const q = sql<RoutesListRow>`
    SELECT
      b.route AS route,
      toString(ifNull(v.views, 0)) AS views,
      toString(ifNull(m.metric_sample_size, 0)) AS metric_sample_size,
      m.percentiles AS percentiles,
      m.metric_value AS metric_value
    FROM (
      SELECT route
      FROM custom_events
      ${viewsWhere}
      GROUP BY route

      UNION DISTINCT

      SELECT route
      FROM cwv_daily_aggregates
      ${routesWhere}
      GROUP BY route
    ) b
    LEFT JOIN (
      SELECT
        route,
        toNullable(countDistinct(session_id)) AS views
      FROM custom_events
      ${viewsWhere}
      GROUP BY route
    ) v
    USING (route)
    LEFT JOIN (
      SELECT
        route,
        percentiles,
        metric_sample_size,
        if(length(percentiles) >= ${idx}, percentiles[${idx}], NULL) AS metric_value
      FROM (
        SELECT
          route,
          quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS percentiles,
          countMerge(sample_size) AS metric_sample_size
        FROM cwv_daily_aggregates
        ${aggregatesWhere}
        GROUP BY route
      )
    ) m
    USING (route)
  `;

  if (query.sort.field === "route") {
    q.append(query.sort.direction === "asc" ? sql` ORDER BY route ASC` : sql` ORDER BY route DESC`);
  } else if (query.sort.field === "views") {
    q.append(
      query.sort.direction === "asc"
        ? sql` ORDER BY ifNull(v.views, 0) ASC, route ASC`
        : sql` ORDER BY ifNull(v.views, 0) DESC, route ASC`,
    );
  } else {
    q.append(
      query.sort.direction === "asc"
        ? sql` ORDER BY isNull(metric_value) ASC, metric_value ASC, ifNull(v.views, 0) DESC, route ASC`
        : sql` ORDER BY isNull(metric_value) ASC, metric_value DESC, ifNull(v.views, 0) DESC, route ASC`,
    );
  }

  q.append(sql` LIMIT ${query.limit} OFFSET ${query.offset}`);
  return q;
}

export type RoutesListTotalCountQuery = BaseFilters & {
  search?: string;
};

type TotalCountRow = {
  total_routes: string;
};

export async function fetchRoutesListTotalCount(query: RoutesListTotalCountQuery): Promise<number> {
  const where = buildPageViewsWhereClause(query, query.search);
  const routesWhere = buildDailyAggregatesBaseWhereClause(query, query.search);

  const rows = await sql<TotalCountRow>`
    SELECT
      toString(count()) AS total_routes
    FROM (
      SELECT route
      FROM custom_events
      ${where}
      GROUP BY route

      UNION DISTINCT

      SELECT route
      FROM cwv_daily_aggregates
      ${routesWhere}
      GROUP BY route
    )
  `;

  return Number(rows[0]?.total_routes ?? 0);
}

export type RoutesStatusDistributionQuery = BaseFilters & {
  search?: string;
  metricName: MetricName;
  percentile: Percentile;
  thresholds: { good: number; needsImprovement: number };
};

export type RouteStatusDistributionRow = {
  status: string;
  route_count: string;
};

export async function fetchRoutesStatusDistribution(
  query: RoutesStatusDistributionQuery,
): Promise<RouteStatusDistributionRow[]> {
  const aggregatesWhere = buildDailyAggregatesWhereClause(query, query.metricName, undefined, query.search);
  const idx = percentileIndex(query.percentile);

  return sql<RouteStatusDistributionRow>`
    WITH
      toFloat64(${query.thresholds.good}) AS good_threshold,
      toFloat64(${query.thresholds.needsImprovement}) AS needs_threshold

    SELECT
      status,
      toString(count()) AS route_count
    FROM (
      SELECT
        route,
        multiIf(metric_value <= good_threshold, 'good', metric_value <= needs_threshold, 'needs-improvement', 'poor') AS status
      FROM (
        SELECT
          route,
          quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS percentiles,
          if(length(percentiles) >= ${idx}, percentiles[${idx}], NULL) AS metric_value
        FROM cwv_daily_aggregates
        ${aggregatesWhere}
        GROUP BY route
      )
      WHERE metric_value IS NOT NULL
    )
    GROUP BY status
  `;
}

export type RouteViewsQuery = BaseFilters & {
  route: string;
};

type ViewsRow = {
  views: string;
};

export async function fetchRouteViews(query: RouteViewsQuery): Promise<number> {
  const where = buildCustomEventsWhereClause(query, [PAGE_VIEW_EVENT_NAME], query.route);
  const rows = await sql<ViewsRow>`
    SELECT
      toString(countDistinct(session_id)) AS views
    FROM custom_events
    ${where}
  `;
  return Number(rows[0]?.views ?? 0);
}

export type RouteMetricsSummaryQuery = BaseFilters & {
  route: string;
};

export type RouteMetricSummaryRow = {
  metric_name: MetricName;
  percentiles: number[];
  sample_size: string;
};

export async function fetchRouteMetricsSummary(query: RouteMetricsSummaryQuery): Promise<RouteMetricSummaryRow[]> {
  const start = toDateOnlyString(query.range.start);
  const end = toDateOnlyString(query.range.end);

  const where = sql`
    WHERE project_id = ${query.projectId}
      AND route = ${query.route}
      AND event_date BETWEEN toDate(${start}) AND toDate(${end})
  `;

  if (query.deviceType !== "all") {
    where.append(sql` AND device_type = ${query.deviceType}`);
  }

  return sql<RouteMetricSummaryRow>`
    SELECT
      metric_name,
      quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS percentiles,
      toString(countMerge(sample_size)) AS sample_size
    FROM cwv_daily_aggregates
    ${where}
    GROUP BY metric_name
    ORDER BY metric_name ASC
  `;
}

export type RouteMetricDailySeriesQuery = BaseFilters & {
  route: string;
  metricName: MetricName;
};

export type RouteMetricDailySeriesRow = {
  event_date: string;
  percentiles: number[];
  sample_size: string;
};

export async function fetchRouteMetricDailySeries(
  query: RouteMetricDailySeriesQuery,
): Promise<RouteMetricDailySeriesRow[]> {
  const where = buildDailyAggregatesWhereClause(query, query.metricName, query.route);

  return sql<RouteMetricDailySeriesRow>`
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

export type RouteMetricDistributionQuery = BaseFilters & {
  route: string;
  metricName: MetricName;
};

export type RouteMetricDistributionRow = {
  status: string;
  session_count: string;
};

export async function fetchRouteMetricDistribution(
  query: RouteMetricDistributionQuery,
): Promise<RouteMetricDistributionRow[]> {
  const where = buildCwvEventsWhereClause(query, query.metricName, query.route);

  return sql<RouteMetricDistributionRow>`
    SELECT
      rating AS status,
      toString(countDistinct(session_id)) AS session_count
    FROM cwv_events
    ${where}
    GROUP BY rating
  `;
}

export type RouteEventOverlayQuery = BaseFilters & {
  route: string;
  eventName: string;
};

export type RouteEventOverlayRow = {
  event_date: string;
  views: string;
  conversions: string;
};

export async function fetchRouteEventOverlaySeries(query: RouteEventOverlayQuery): Promise<RouteEventOverlayRow[]> {
  const where = buildCustomEventsWhereClause(query, [PAGE_VIEW_EVENT_NAME, query.eventName], query.route);

  return sql<RouteEventOverlayRow>`
    SELECT
      toString(toDate(recorded_at)) AS event_date,
      toString(countDistinctIf(session_id, event_name = ${PAGE_VIEW_EVENT_NAME})) AS views,
      toString(countDistinctIf(session_id, event_name = ${query.eventName})) AS conversions
    FROM custom_events
    ${where}
    GROUP BY toDate(recorded_at)
    ORDER BY toDate(recorded_at) ASC
  `;
}
