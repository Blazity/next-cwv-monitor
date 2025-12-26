import { TimeRangeKey } from '@/app/server/domain/dashboard/overview/types';
import { sql } from '@/app/server/lib/clickhouse/client';
import type { CustomEventRow, InsertableCustomEventRow } from '@/app/server/lib/clickhouse/schema';
import { daysToNumber } from '@/lib/utils';

type CustomEventFilters = {
  projectId: string;
  route?: string;
  name?: string;
  start?: Date;
  end?: Date;
  limit?: number;
};

type FetchEventsPageFilters = {
  range: TimeRangeKey;
  projectId: string;
  eventName: string;
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

  await sql`
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
    VALUES ${sql.values(rows, [
      'String',
      'String',
      'String',
      'String',
      'String',
      'String',
      'DateTime64(3)',
      'DateTime64(3)'
    ])}
  `.command();
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

export async function fetchEventsStatsData({ range, eventName, projectId }: FetchEventsPageFilters) {
  const negativeRange = daysToNumber[range] * -1;
  const query = sql`
    SELECT
        ce.route,
        uniqExactIf(tuple(ce.session_id, ce.event_name),
            ce.recorded_at >= addDays(now(), ${negativeRange}) AND ce.recorded_at < now()
            AND ce.event_name NOT LIKE '$%') AS conversions_cur,

        uniqExactIf(tuple(ce.session_id, ce.event_name),
            ce.recorded_at >= addDays(now(), ${negativeRange}) AND ce.recorded_at < now()
            AND ce.event_name LIKE '$page_view') AS views_cur,

        uniqExactIf(tuple(ce.session_id, ce.event_name),
            ce.recorded_at >= addDays(addDays(now(), ${negativeRange}), ${negativeRange * 2}) AND ce.recorded_at < addDays(now(), ${negativeRange})
            AND ce.event_name NOT LIKE '$%') AS visits_prev,

        uniqExactIf(tuple(ce.session_id, ce.event_name),
            ce.recorded_at >= addDays(addDays(now(), ${negativeRange}), ${negativeRange * 2}) AND ce.recorded_at < addDays(now(), ${negativeRange})
            AND ce.event_name LIKE '$page_view') AS views_prev,

        if(visits_prev = 0, NULL, (conversions_cur - visits_prev) / visits_prev * 100) AS visits_change_pct,
        if(views_prev = 0, NULL, (views_cur - views_prev) / views_prev * 100) AS views_change_pct
    FROM
    custom_events AS ce
    WHERE
    ce.recorded_at >= addDays(now(), ${negativeRange * 2})
    AND ce.recorded_at < now()
    AND ce.event_name = ${eventName}
    AND ce.project_id = ${projectId}
    GROUP BY
    ce.route
    ORDER BY
    conversions_cur DESC;
  `;
  return query;
}

export async function fetchTotalStatsEvents({ projectId, range }: Omit<FetchEventsPageFilters, 'eventName'>) {
  const negativeRange = daysToNumber[range] * -1;
  const query = sql`
    SELECT
    	uniqExactIf(tuple(session_id, event_name),
                recorded_at >= addDays(now(), ${negativeRange}) AND ce.recorded_at < now()
                AND event_name NOT LIKE '$%') AS conversions_count_cur,
    	uniqExactIf(session_id,
                recorded_at >= addDays(now(), ${negativeRange}) AND ce.recorded_at < now()
                AND event_name LIKE '$%')as total_views_cur,
    	countIf(
                recorded_at >= addDays(now(), ${negativeRange}) AND ce.recorded_at < now()
            ) AS total_events_cur,
    	uniqExactIf(tuple(session_id, event_name),
                recorded_at >= addDays(addDays(now(), ${negativeRange}), ${negativeRange * 2}) AND ce.recorded_at < addDays(now(), ${negativeRange})
                AND event_name NOT LIKE '$%') AS conversions_count_prev,
    	uniqExactIf(session_id,
                recorded_at >= addDays(addDays(now(), ${negativeRange}), ${negativeRange * 2}) AND ce.recorded_at < addDays(now(), ${negativeRange})
                AND event_name LIKE '$%')as total_views_cur_prev,
    	countIf(
                recorded_at >= addDays(addDays(now(), ${negativeRange}), ${negativeRange * 2}) AND ce.recorded_at < addDays(now(), ${negativeRange})
            ) AS total_events_prev
 
    FROM
    	custom_events ce
    WHERE
    	ce.recorded_at >= addDays(now(), ${negativeRange * 2})
    	AND ce.recorded_at < now()
    	AND ce.project_id = ${projectId}
  
  `;
  return query;
}
