import {
  BaseFilters,
  DateRange,
  DateRangeWithPrev,
  IntervalKey,
  PAGE_VIEW_EVENT_NAME,
  SqlFragment,
  toDateOnlyString,
} from "@/app/server/domain/dashboard/overview/types";
import { sql } from "@/app/server/lib/clickhouse/client";
import type { CustomEventRow, InsertableCustomEventRow } from "@/app/server/lib/clickhouse/schema";
import { DeviceFilter } from "@/app/server/lib/device-types";
import { chunkGenerator, parseClickHouseNumbers } from "@/lib/utils";
import { coerceClickHouseDateTime } from "@/lib/utils";

type CustomEventFilters = {
  projectId: string;
  route?: string;
  name?: string;
  start?: Date;
  end?: Date;
  limit?: number;
};

export async function insertCustomEvents(events: InsertableCustomEventRow[]): Promise<void> {
  if (events.length === 0) return;
  const rows = events.map((event) => {
    const recordedAt = coerceClickHouseDateTime(event.recorded_at ?? new Date());
    const ingestedAt = coerceClickHouseDateTime(event.ingested_at ?? new Date());

    return [
      event.project_id,
      event.session_id,
      event.route,
      event.path,
      event.device_type,
      event.event_name,
      recordedAt,
      ingestedAt,
    ];
  });

  const promiseChunk = [];
  for (const chunk of chunkGenerator({ array: rows })) {
    promiseChunk.push(
      sql`
        INSERT INTO custom_events (
          project_id,
          session_id,
          route,
          path,
          device_type,
          event_name,
          recorded_at,
          ingested_at
        )
        VALUES ${sql.values(chunk, [
          "String",
          "String",
          "String",
          "String",
          "String",
          "String",
          "DateTime64(3)",
          "DateTime64(3)",
        ])}
      `.command(),
    );
  }
  await Promise.all(promiseChunk);
}

export async function fetchCustomEvents(filters: CustomEventFilters): Promise<CustomEventRow[]> {
  const { projectId, route, name, start, end, limit = 200 } = filters;

  const query = sql<CustomEventRow>`
    SELECT
      project_id,
      session_id,
      route,
      path,
      device_type,
      event_name,
      recorded_at,
      ingested_at
    FROM custom_events
    WHERE project_id = ${projectId}
  `;

  if (route) {
    query.append(sql` AND route = ${route}`);
  }

  if (name) {
    query.append(sql` AND event_name = ${name}`);
  }

  if (start) {
    const startCoerced = coerceClickHouseDateTime(start);
    query.append(sql` AND recorded_at >= ${startCoerced}`);
  }

  if (end) {
    const endCoerced = coerceClickHouseDateTime(end);
    query.append(sql` AND recorded_at <= ${endCoerced}`);
  }

  query.append(sql` ORDER BY recorded_at DESC LIMIT ${limit}`);

  return query;
}

type FetchEventsStatsData = {
  range: DateRange & { prevStart: Date };
  projectId: string;
  eventNames: string[];
  deviceType: DeviceFilter;
};

type FetchEventsStatsDataResult = {
  route: string;
  conversions_cur: number;
  views_cur: number;
  conversions_prev: number;
  views_prev: number;
  conversion_rate_prev: number | null;
  conversion_change_pct: number | null;
  views_change_pct: number | null;
  conversion_rate: number | null;
};

export async function fetchEventsStatsData({ range, eventNames, projectId, deviceType }: FetchEventsStatsData) {
  if (eventNames.length === 0) return [];

  const { start, end, prevStart } = range;

  const query = sql<FetchEventsStatsDataResult>`
    WITH
      if(views_cur = 0, NULL, (conversions_cur / views_cur) * 100) AS conversion_rate,
      if(views_prev = 0, NULL, (conversions_prev / views_prev) * 100) AS conversion_rate_prev
    SELECT
      route,
      uniqExact(session_id) FILTER (WHERE recorded_at >= ${start} AND recorded_at < ${end} AND event_name = ${PAGE_VIEW_EVENT_NAME}) as views_cur,
      uniqExact(session_id, event_name) FILTER (WHERE recorded_at >= ${start} AND recorded_at < ${end} AND event_name IN (${eventNames})) as conversions_cur,
      uniqExact(session_id) FILTER (WHERE recorded_at >= ${prevStart} AND recorded_at < ${start} AND event_name = ${PAGE_VIEW_EVENT_NAME}) as views_prev,
      uniqExact(session_id, event_name) FILTER (WHERE recorded_at >= ${prevStart} AND recorded_at < ${start} AND event_name IN (${eventNames})) as conversions_prev,

      conversion_rate,
      conversion_rate_prev,
      if(
        conversion_rate_prev IS NULL OR conversion_rate_prev = 0,
        NULL,
        ((conversion_rate - conversion_rate_prev) / conversion_rate_prev) * 100
      ) AS conversion_change_pct,

      if(views_prev = 0, NULL, ((views_cur - views_prev) / views_prev) * 100) AS views_change_pct

    FROM custom_events
    WHERE project_id = ${projectId}
      AND recorded_at >= ${prevStart}
      AND recorded_at < ${end}
      AND (event_name IN (${eventNames}) OR event_name = ${PAGE_VIEW_EVENT_NAME})
  `;

  if (deviceType !== "all") {
    query.append(sql` AND device_type = ${deviceType}`);
  }

  query.append(sql` GROUP BY route ORDER BY conversions_cur DESC`);

  const results = await query;
  return results.map((row) => parseClickHouseNumbers(row));
}

export function buildCustomEventsWhereClause(filters: BaseFilters, eventNames: string[], route?: string): SqlFragment {
  const where = sql`
    WHERE project_id = ${filters.projectId}
      AND recorded_at >= ${filters.range.start}
      AND recorded_at < ${filters.range.end}
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

export type MultiEventOverlayRow = {
  event_date: string;
  event_name: string;
  views: string;
  conversions: string;
};

const INTERVAL_EXPRESSIONS: Record<IntervalKey, string> = {
  hour: "toStartOfHour(recorded_at, 'UTC')",
  day: "toDate(recorded_at)",
  week: "toStartOfWeek(toDate(recorded_at), 0)",
  month: "toStartOfMonth(toDate(recorded_at))",
};

export async function fetchMultiEventOverlaySeries(
  query: BaseFilters & {
    route?: string;
    eventNames: string[];
    interval: IntervalKey;
  },
): Promise<MultiEventOverlayRow[]> {
  const allEvents = [PAGE_VIEW_EVENT_NAME, ...query.eventNames];
  const where = buildCustomEventsWhereClause(query, allEvents, query.route);

  const rawExpr = INTERVAL_EXPRESSIONS[query.interval] || INTERVAL_EXPRESSIONS.day;
  const periodExpr = sql.raw(rawExpr);

  return sql<MultiEventOverlayRow>`
    SELECT
      toString(period) AS event_date,
      event_name,
      toString(max(period_views) OVER (PARTITION BY period)) AS views,
      toString(conversions) AS conversions
    FROM (
      SELECT 
        ${periodExpr} AS period,
        event_name,
        uniqExact(session_id) AS conversions,
        uniqExactIf(session_id, event_name = ${PAGE_VIEW_EVENT_NAME}) AS period_views
      FROM custom_events
      ${where}
      GROUP BY period, event_name
    )
    QUALIFY event_name != ${PAGE_VIEW_EVENT_NAME}
    ORDER BY period ASC, event_name ASC
  `;
}

type FetchTotalStatsEvents = {
  range: DateRangeWithPrev;
  projectId: string;
  deviceType: DeviceFilter;
};

export type FetchEventsTotalStatsResult = {
  total_conversions_cur: number;
  total_views_cur: number;
  total_events_cur: number;

  total_conversions_prev: number;
  total_views_prev: number;
  total_events_prev: number;

  total_conversion_change_pct: number | null;
  total_views_change_pct: number | null;
};

export async function fetchTotalStatsEvents({ projectId, range, deviceType }: FetchTotalStatsEvents) {
  const {start, end, prevStart} = range; 

  const query = sql<FetchEventsTotalStatsResult>`
    SELECT
      uniqExactIf(tuple(session_id, event_name), recorded_at >= ${start} AND recorded_at < ${end} AND event_name != ${PAGE_VIEW_EVENT_NAME}) AS total_conversions_cur,
      uniqExactIf(session_id, recorded_at >= ${start} AND recorded_at < ${end} AND event_name = ${PAGE_VIEW_EVENT_NAME}) AS total_views_cur,
      uniqExactIf(event_name, recorded_at >= ${start} AND recorded_at < ${end} AND event_name != ${PAGE_VIEW_EVENT_NAME}) AS total_events_cur,

      uniqExactIf(tuple(session_id, event_name), recorded_at >= ${prevStart} AND recorded_at < ${start} AND event_name != ${PAGE_VIEW_EVENT_NAME}) AS total_conversions_prev,
      uniqExactIf(session_id, recorded_at >= ${prevStart} AND recorded_at < ${start} AND event_name = ${PAGE_VIEW_EVENT_NAME}) AS total_views_prev,
      uniqExactIf(event_name, recorded_at >= ${prevStart} AND recorded_at < ${start} AND event_name != ${PAGE_VIEW_EVENT_NAME}) AS total_events_prev,

      if(total_conversions_prev = 0, NULL, ((total_conversions_cur - total_conversions_prev) / total_conversions_prev) * 100) AS total_conversion_change_pct,
      if(total_views_prev = 0, NULL, ((total_views_cur - total_views_prev) / total_views_prev) * 100) AS total_views_change_pct
    FROM custom_events
    WHERE 
      project_id = ${projectId} 
      AND recorded_at >= ${prevStart} AND recorded_at < ${end}
  `;

  if (deviceType !== "all") {
    query.append(sql` AND device_type = ${deviceType}`);
  }

  const result = await query;

  return parseClickHouseNumbers(result[0]);
}

type FetchEvents = {
  range: DateRange;
  projectId: string;
  limit?: number;
  deviceType: DeviceFilter;
};

export type FetchEventResult = {
  event_name: string;
  records_count: number;
};

export async function fetchEvents({ projectId, range, limit, deviceType }: FetchEvents) {
  const { start, end } = range;

  const query = sql<FetchEventResult>`
    SELECT
      ce.event_name,
      count() AS records_count
    FROM custom_events AS ce
    WHERE ce.project_id = ${projectId}
      AND ce.recorded_at >= ${start}
      AND ce.recorded_at < ${end}
      AND ce.event_name != ${PAGE_VIEW_EVENT_NAME}
  `;

  if (deviceType !== "all") {
    query.append(sql` AND ce.device_type = ${deviceType}`);
  }

  query.append(sql` GROUP BY ce.event_name ORDER BY records_count DESC`);

  if (limit) {
    query.append(sql` LIMIT ${limit}`);
  }

  return query;
}

type FetchConversionTrend = {
  range: DateRange;
  projectId: string;
  eventNames: string[];
  deviceType: DeviceFilter;
};

type FetchConversionTrendResult = {
  day: string;
  views: string;
  events: string;
  conversion_rate: number | null;
};

export async function fetchConversionTrend({ projectId, eventNames, range, deviceType }: FetchConversionTrend) {
  if (eventNames.length === 0) return [];

  const { end, start } = range;

  const allEventNames = [...eventNames, PAGE_VIEW_EVENT_NAME];

  const innerWhere = sql`
    WHERE ce.project_id = ${projectId}
      AND ce.recorded_at >= ${start}
      AND ce.recorded_at < ${end}
      AND ce.event_name IN (${allEventNames})
  `;

  if (deviceType !== "all") {
    innerWhere.append(sql` AND ce.device_type = ${deviceType}`);
  }

  const query = sql<FetchConversionTrendResult>`
    SELECT
      day,
      views,
      events,
      if(views = 0, NULL, (events / views) * 100) AS conversion_rate
    FROM (
      SELECT
        toDate(ce.recorded_at) AS day,
        uniqExactIf(ce.session_id, ce.event_name = ${PAGE_VIEW_EVENT_NAME}) AS views,
        uniqExactIf(ce.session_id, ce.event_name != ${PAGE_VIEW_EVENT_NAME}) AS events
      FROM
        custom_events AS ce
      ${innerWhere}
      GROUP BY day
    )
    ORDER BY day
    WITH FILL
      FROM toDate(${toDateOnlyString(start)})
      TO toDate(${toDateOnlyString(end)})
      STEP 1;
  `;

  return query;
}

type FetchProjectEventNames = {
  projectId: string;
};

type FetchProjectEventNamesResult = {
  event_name: string;
};

export async function fetchProjectEventNames({ projectId }: FetchProjectEventNames) {
  const query = sql<FetchProjectEventNamesResult>`
    SELECT event_name
    FROM custom_events
    WHERE project_id = ${projectId} AND event_name != ${PAGE_VIEW_EVENT_NAME}
    GROUP BY event_name
    ORDER BY event_name ASC
  `;
  return query;
}
