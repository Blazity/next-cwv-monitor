import { sql } from '@/app/server/lib/clickhouse/client';
import type { CustomEventRow, InsertableCustomEventRow } from '@/app/server/lib/clickhouse/schema';

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

