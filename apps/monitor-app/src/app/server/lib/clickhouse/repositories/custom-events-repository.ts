import { TimeRangeKey } from "@/app/server/domain/dashboard/overview/types";
import { sql } from "@/app/server/lib/clickhouse/client";
import type { CustomEventRow, InsertableCustomEventRow } from "@/app/server/lib/clickhouse/schema";
import { chunkGenerator, daysToNumber, getPeriodDates, parseClickHouseNumbers } from "@/lib/utils";
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
  range: TimeRangeKey;
  projectId: string;
  eventName: string;
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

export async function fetchEventsStatsData({ range, eventName, projectId }: FetchEventsStatsData) {
  if (!eventName) return [];

  const { currentStart, prevStart } = getPeriodDates(range);

  const query = sql<FetchEventsStatsDataResult>`
    WITH
      if(views_cur = 0, NULL, (conversions_cur / views_cur) * 100) AS conversion_rate,
      if(views_prev = 0, NULL, (conversions_prev / views_prev) * 100) AS conversion_rate_prev
    SELECT
      route,
      uniqExact(session_id) FILTER (WHERE recorded_at >= ${currentStart} AND event_name = '$page_view') as views_cur,
      uniqExact(session_id, event_name) FILTER (WHERE recorded_at >= ${currentStart} AND event_name = ${eventName}) as conversions_cur,
      uniqExact(session_id) FILTER (WHERE recorded_at >= ${prevStart} AND recorded_at < ${currentStart} AND event_name = '$page_view') as views_prev,
      uniqExact(session_id, event_name) FILTER (WHERE recorded_at >= ${prevStart} AND recorded_at < ${currentStart} AND event_name = ${eventName}) as conversions_prev,

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
      AND (event_name = ${eventName} OR event_name = '$page_view')
    GROUP BY route
    ORDER BY conversions_cur DESC
  `;

  const results = await query;
  return results.map((row) => parseClickHouseNumbers(row));
}

type FetchTotalStatsEvents = {
  range: TimeRangeKey;
  projectId: string;
};

type FetchTotalStatsEventsResult = {
  total_conversions_cur: number;
  total_views_cur: number;
  total_events_cur: number;

  total_conversions_prev: number;
  total_views_prev: number;
  total_events_prev: number;

  total_conversion_change_pct: number | null;
  total_views_change_pct: number | null;
};

export async function fetchTotalStatsEvents({ projectId, range }: FetchTotalStatsEvents) {
  const { now, currentStart, prevStart } = getPeriodDates(range);

  const query = await sql<FetchTotalStatsEventsResult>`
    SELECT
      uniqExactIf(tuple(session_id, event_name), recorded_at >= ${currentStart} AND event_name != '$page_view') AS total_conversions_cur,
      uniqExactIf(session_id, recorded_at >= ${currentStart} AND event_name = '$page_view') AS total_views_cur,
      uniqExactIf(event_name, recorded_at >= ${currentStart} AND event_name != '$page_view') AS total_events_cur,

      uniqExactIf(tuple(session_id, event_name), recorded_at >= ${prevStart} AND recorded_at < ${currentStart} AND event_name != '$page_view') AS total_conversions_prev,
      uniqExactIf(session_id, recorded_at >= ${prevStart} AND recorded_at < ${currentStart} AND event_name = '$page_view') AS total_views_prev,
      uniqExactIf(event_name, recorded_at >= ${prevStart} AND recorded_at < ${currentStart} AND event_name != '$page_view') AS total_events_prev,

      if(total_conversions_prev = 0, NULL, ((total_conversions_cur - total_conversions_prev) / total_conversions_prev) * 100) AS total_conversion_change_pct,
      if(total_views_prev = 0, NULL, ((total_views_cur - total_views_prev) / total_views_prev) * 100) AS total_views_change_pct
    FROM custom_events
    WHERE 
      project_id = ${projectId} 
      AND recorded_at >= ${prevStart} AND recorded_at <= ${now}
  `;

  return parseClickHouseNumbers(query[0]);
}

type FetchEvents = {
  range: TimeRangeKey;
  projectId: string;
  limit?: number;
};

type FetchMostActiveEventResult = {
  event_name: string;
  records_count: number;
};

export async function fetchEvents({ projectId, range, limit }: FetchEvents) {
  const negativeRange = daysToNumber[range] * -1;
  const query = sql<FetchMostActiveEventResult | undefined>`
    SELECT
      ce.event_name,
      count() AS records_count
    FROM custom_events AS ce
    WHERE ce.project_id = ${projectId}
      AND ce.recorded_at >= addDays(now(), ${negativeRange})
      AND ce.recorded_at < now()
      AND ce.event_name NOT LIKE '$page_view'
      GROUP BY ce.event_name
    ORDER BY records_count DESC
  `;
  if (limit) {
    query.append(sql`LIMIT ${limit}`);
  }
  return query;
}

type FetchConversionTrend = {
  range: TimeRangeKey;
  projectId: string;
  eventName: string;
};

type FetchConversionTrendResult = {
  day: string;
  views: string;
  events: string;
  conversion_rate: number | null;
};

export async function fetchConversionTrend({ projectId, eventName, range }: FetchConversionTrend) {
  if (!eventName) return [];

  const { now, currentStart } = getPeriodDates(range);

  const startUnix = Math.floor(currentStart.getTime() / 1000);
  const endUnix = Math.floor(now.getTime() / 1000);

  const query = sql<FetchConversionTrendResult>`
    SELECT
      day,
      views,
      events,
      if(views = 0, NULL, (events / views) * 100) AS conversion_rate
    FROM (
      SELECT
        toDate(ce.recorded_at) AS day,
        uniqExactIf(ce.session_id, ce.event_name = '$page_view') AS views,
        uniqExactIf(tuple(ce.session_id, ce.event_name), ce.event_name = ${eventName}) AS events
      FROM
        custom_events AS ce
      WHERE
        ce.project_id = ${projectId}
        /* Filter precisely by timestamp */
        AND ce.recorded_at >= toDateTime64(${startUnix}, 3)
        AND ce.recorded_at <= toDateTime64(${endUnix}, 3)
        AND ce.event_name IN (${eventName}, '$page_view')
      GROUP BY
        day
    )
    ORDER BY day
    WITH FILL
      /* Align fill start to the calendar day of our real-time start */
      FROM toDate(toDateTime64(${startUnix}, 3))
      TO toDate(toDateTime64(${endUnix}, 3))
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
    WHERE project_id = ${projectId} AND event_name NOT LIKE '$page_view'
    GROUP BY event_name
    ORDER BY event_name ASC
  `;
  return query;
}
