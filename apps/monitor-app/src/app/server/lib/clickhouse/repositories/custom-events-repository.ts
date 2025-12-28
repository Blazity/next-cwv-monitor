import { TimeRangeKey } from '@/app/server/domain/dashboard/overview/types';
import { sql } from '@/app/server/lib/clickhouse/client';
import type { CustomEventRow, InsertableCustomEventRow } from '@/app/server/lib/clickhouse/schema';
import { chunkGenerator, daysToNumber } from '@/lib/utils';
import { map, mapValues } from 'remeda';

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
    const recordedAt = event.recorded_at ?? new Date();
    const ingestedAt = event.ingested_at ?? new Date();

    return [
      event.project_id,
      event.session_id,
      event.route,
      event.path,
      event.device_type,
      event.event_name,
      recordedAt,
      ingestedAt
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
          'String',
          'String',
          'String',
          'String',
          'String',
          'String',
          'DateTime64(3)',
          'DateTime64(3)'
        ])}
      `.command()
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
    query.append(sql` AND recorded_at >= ${start}`);
  }

  if (end) {
    query.append(sql` AND recorded_at <= ${end}`);
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
  conversions_cur: string;
  views_cur: string;
  conversions_prev: string;
  events_prev: string;
  events_cur: string;
  views_prev: string;
  conversion_change_pct: string;
  views_change_pct: string;
  conversion_rate: string;
};

export async function fetchEventsStatsData({ range, eventName, projectId }: FetchEventsStatsData) {
  const negativeRange = daysToNumber[range] * -1;
  const query = sql<FetchEventsStatsDataResult>`
    SELECT
    	ce.route,
    	uniqExactIf(tuple(ce.session_id, ce.event_name),
                ce.recorded_at >= addDays(now(), ${negativeRange}) AND ce.recorded_at < now()
                AND ce.event_name NOT LIKE '$page_view') AS conversions_cur,
    	uniqExactIf(tuple(ce.session_id),
                ce.recorded_at >= addDays(now(), ${negativeRange}) AND ce.recorded_at < now()
                AND ce.event_name LIKE '$page_view') AS views_cur,
      uniqExactIf(tuple(ce.session_id, ce.event_name),
          ce.recorded_at >= addDays(now(), ${negativeRange})
          AND ce.recorded_at < now() AND ce.event_name NOT LIKE '$page_view'
        ) AS events_cur,

    	uniqExactIf(tuple(ce.session_id, ce.event_name),
                ce.recorded_at >= addDays(addDays(now(), ${negativeRange}), 2 * ${negativeRange}) AND ce.recorded_at < addDays(now(), ${negativeRange})
                AND ce.event_name NOT LIKE '$page_view') AS conversions_prev,
    	uniqExactIf(tuple(ce.session_id),
                ce.recorded_at >= addDays(addDays(now(), ${negativeRange}), 2 * ${negativeRange}) AND ce.recorded_at < addDays(now(), ${negativeRange})
                AND ce.event_name LIKE '$page_view') AS views_prev,
      uniqExactIf(tuple(ce.session_id, ce.event_name),
                    ce.recorded_at >= addDays(addDays(now(), ${negativeRange}), 2 * ${negativeRange})
                    AND ce.recorded_at < addDays(now(), ${negativeRange})
                    AND ce.event_name NOT LIKE '$page_view'
                ) AS events_prev,

    	if(conversions_prev = 0, NULL, ((conversions_cur - conversions_prev) / ((conversions_cur + conversions_prev)/ 2)) * 100) AS conversion_change_pct,
    	if(views_prev = 0, NULL, ((views_cur - views_prev) / ((views_cur + views_prev)/ 2)) * 100) AS views_change_pct,
      if(events_cur = 0, NULL, (events_cur / views_cur) * 100) as conversion_rate

        FROM
        custom_events AS ce
        WHERE
        ce.recorded_at >= addDays(now(), 2 * ${negativeRange})
        AND ce.recorded_at < now()
        AND ce.project_id = ${projectId}
        AND (ce.event_name = ${eventName} OR ce.event_name = '$page_view')
        GROUP BY
        ce.route
        ORDER BY
        conversions_cur DESC;
  `;
  const data = await query;
  return map(data, (v) =>
    mapValues(v, (v) => {
      if (!Number.isNaN(Number(v))) return Number(v);
      return v;
    })
  );
}

type FetchTotalStatsEvents = {
  range: TimeRangeKey;
  projectId: string;
};

type FetchTotalStatsEventsResult = {
  total_conversions_cur: string;
  total_views_cur: string;
  total_events_cur: string;

  total_conversions_prev: string;
  total_views_prev: string;
  total_events_prev: string;

  total_conversion_change_pct: string;
  total_views_change_pct: string;
};

export async function fetchTotalStatsEvents({ projectId, range }: FetchTotalStatsEvents) {
  const negativeRange = daysToNumber[range] * -1;
  const query = await sql<FetchTotalStatsEventsResult>`
    SELECT
    	uniqExactIf(tuple(ce.session_id, ce.event_name),
                    ce.recorded_at >= addDays(now(), ${negativeRange}) AND ce.recorded_at <= now()
                    AND ce.event_name NOT LIKE '$page_view'
                    )
              AS total_conversions_cur,
    	uniqExactIf(ce.session_id,
                    ce.recorded_at >= addDays(now(), ${negativeRange}) AND ce.recorded_at <= now()
                    AND ce.event_name LIKE '$page_view') AS total_views_cur,
    	uniqExactIf(
          ce.event_name,
          ce.recorded_at >= addDays(now(), ${negativeRange})
          AND ce.recorded_at < now() AND ce.event_name NOT LIKE '$page_view'
        ) AS total_events_cur,
 
    	uniqExactIf(tuple(ce.session_id, ce.event_name),
                    ce.recorded_at >= addDays(addDays(now(), ${negativeRange}), 2 * ${negativeRange}) AND ce.recorded_at <= addDays(now(), ${negativeRange})
                    AND ce.event_name NOT LIKE '$page_view') AS total_conversions_prev,
    	uniqExactIf(ce.session_id,
                    ce.recorded_at >= addDays(addDays(now(), ${negativeRange}), 2 * ${negativeRange}) AND ce.recorded_at <= addDays(now(), ${negativeRange})
                    AND ce.event_name LIKE '$page_view') AS total_views_prev,
    	uniqExactIf(
                    ce.event_name,
                    ce.recorded_at >= addDays(addDays(now(), ${negativeRange}), 2 * ${negativeRange})
                    AND ce.recorded_at < addDays(now(), ${negativeRange})
                    AND ce.event_name NOT LIKE '$page_view'
                ) AS total_events_prev,
      if(total_conversions_prev = 0, NULL, ((total_conversions_cur - total_conversions_prev) / ((total_conversions_cur + total_conversions_prev)/ 2)) * 100) AS total_conversion_change_pct,
    	if(total_views_prev = 0, NULL, ((total_views_cur - total_views_prev) / ((total_views_cur + total_views_prev)/ 2)) * 100) AS total_views_change_pct
    FROM
    	custom_events ce
    WHERE
    	ce.recorded_at >= addDays(now(), 2 * ${negativeRange})
    	AND ce.recorded_at <= now()
    	AND ce.project_id = ${projectId}
  `;
  const [totalStats] = query;
  return mapValues(totalStats, (v) => {
    if (!Number.isNaN(Number(v))) return Number(v);
    return v;
  });
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

  const query = sql<FetchMostActiveEventResult>`
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
};

type FetchConversionTrendResult = {
  day: string;
  views: string;
  events: string;
  conversion_rate: number;
};

export async function fetchConversionTrend({ projectId, range }: FetchConversionTrend) {
  const negativeRange = daysToNumber[range] * -1;

  const query = sql<FetchConversionTrendResult>`
    SELECT
    	day,
    	views,
    	events,
    	if(views = 0, NULL, events / views * 100) AS conversion_rate
    FROM
    	(
    	SELECT
    		toDate(ce.recorded_at) AS day,
    		uniqExactIf(ce.session_id, ce.event_name = '$page_view') AS views,
    		uniqExactIf(tuple(ce.session_id, ce.event_name), ce.event_name != '$page_view') AS events
    	FROM
    		custom_events AS ce
    	WHERE
    		ce.recorded_at >= toDate(addDays(now(), ${negativeRange}))
    		AND ce.recorded_at < addDays(toDate(now()), 1)
    		AND ce.project_id = ${projectId}
    	GROUP BY
    		day
    )
    ORDER BY
    	day
    WITH FILL
    FROM
    	toDate(addDays(now(), ${negativeRange}))
      TO toDate(now())
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
