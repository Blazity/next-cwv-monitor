import { sql } from "@/app/server/lib/clickhouse/client";
import type { CwvEventRow, InsertableCwvEventRow } from "@/app/server/lib/clickhouse/schema";

type EventFilters = {
  projectId: string;
  route?: string;
  start?: Date;
  end?: Date;
  limit?: number;
};

export async function insertEvents(events: InsertableCwvEventRow[]): Promise<void> {
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
      event.metric_name,
      event.metric_value,
      event.rating,
      recordedAt,
      ingestedAt
    ];
  });

  await sql`
    INSERT INTO cwv_events (
      project_id,
      session_id,
      route,
      path,
      device_type,
      metric_name,
      metric_value,
      rating,
      recorded_at,
      ingested_at
    )
    VALUES ${sql.values(rows, [
      "String",
      "String",
      "String",
      "String",
      "String",
      "String",
      "Float64",
      "String",
      "DateTime64(3)",
      "DateTime64(3)"
    ])}
  `.command();
}

export async function fetchEvents(filters: EventFilters): Promise<CwvEventRow[]> {
  const { projectId, route, start, end, limit = 200 } = filters;

  const query = sql<CwvEventRow>`
    SELECT
      project_id,
      session_id,
      route,
      path,
      device_type,
      metric_name,
      metric_value,
      rating,
      recorded_at,
      ingested_at
    FROM cwv_events
    WHERE project_id = ${projectId}
  `;

  if (route) {
    query.append(sql` AND route = ${route}`);
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
