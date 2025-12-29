import { sql } from '@/app/server/lib/clickhouse/client';
import type {
  InsertableProjectRow,
  ProjectRow,
  ProjectWithViews,
  UpdatableProjectRow
} from '@/app/server/lib/clickhouse/schema';

export async function createProject(project: InsertableProjectRow): Promise<void> {
  const createdAtRaw = project.created_at ?? new Date();
  const updatedAtRaw = project.updated_at ?? createdAtRaw;

  const createdAt = createdAtRaw instanceof Date ? createdAtRaw : new Date(createdAtRaw);
  const updatedAt = updatedAtRaw instanceof Date ? updatedAtRaw : new Date(updatedAtRaw);

  const createdAtSeconds = Math.floor(createdAt.getTime() / 1000);
  const updatedAtSeconds = Math.floor(updatedAt.getTime() / 1000);

  await sql`
    INSERT INTO projects (id, slug, name, created_at, updated_at)
    VALUES (
      ${project.id},
      ${project.slug},
      ${project.name},
      toDateTime(${createdAtSeconds}),
      toDateTime(${updatedAtSeconds})
    )
  `.command();
}

export async function getProjectById(id: string): Promise<ProjectRow | null> {
  // TODO: We should consider don't we need top-level method that will use `use cache` with specific tag
  // Now we are not caching projects that doesn't change very often
  const rows = await sql<ProjectRow>`
    SELECT id, slug, name, events_display_settings, created_at, updated_at
    FROM projects FINAL
    WHERE id = ${id}
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getProjectWithViewsById(id: string): Promise<ProjectWithViews | null> {
  const rows = await sql<ProjectWithViews>`
    SELECT 
      p.id, p.slug, p.name, p.created_at, p.updated_at,
      toUInt64(countMerge(stats.sample_size)) as trackedViews
    FROM projects AS p FINAL
    LEFT JOIN cwv_daily_aggregates AS stats ON p.id = stats.project_id
    WHERE p.id = ${id}
    GROUP BY p.id, p.slug, p.name, p.created_at, p.updated_at
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getProjectBySlug(slug: string): Promise<ProjectRow | null> {
  const rows = await sql<ProjectRow>`
    SELECT id, slug, name, created_at, updated_at
    FROM projects FINAL
    WHERE slug = ${slug}
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function listProjects(): Promise<ProjectRow[]> {
  return sql<ProjectRow>`
    SELECT id, slug, name, created_at, updated_at
    FROM projects FINAL
    ORDER BY created_at DESC
  `;
}

export async function listProjectsWithViews(): Promise<ProjectWithViews[]> {
  return sql<ProjectWithViews>`
    SELECT 
      p.id, p.slug, p.name, p.created_at, p.updated_at,
      toUInt64(countMerge(stats.sample_size)) as trackedViews
    FROM projects AS p FINAL
    LEFT JOIN cwv_daily_aggregates AS stats ON p.id = stats.project_id
    GROUP BY p.id, p.slug, p.name, p.created_at, p.updated_at
    ORDER BY p.created_at DESC
  `;
}

export async function updateProjectEventSettings(project: UpdatableProjectRow): Promise<void> {
  const { id, created_at, events_display_settings } = project;
  const createdAt = created_at && created_at instanceof Date ? created_at : new Date(created_at);
  const createdAtSeconds = Math.floor(createdAt.getTime() / 1000);
  const updatedAtSeconds = Math.floor(Date.now() / 1000);
  await sql`
    INSERT INTO projects (id, events_display_settings, created_at, updated_at)
    VALUES (
      ${id}, 
      ${events_display_settings},
      toDateTime(${createdAtSeconds}), 
      toDateTime(${updatedAtSeconds})
    )
  `.command();
}

export async function updateProject(project: UpdatableProjectRow): Promise<void> {
  const { id, name, slug, created_at, events_display_settings } = project;
  const createdAt = created_at && created_at instanceof Date ? created_at : new Date(created_at);
  const createdAtSeconds = Math.floor(createdAt.getTime() / 1000);
  const updatedAtSeconds = Math.floor(Date.now() / 1000);
  await sql`
    INSERT INTO projects (id, name, slug, events_display_settings, created_at, updated_at)
    VALUES (
      ${id}, 
      ${name}, 
      ${slug}, 
      ${events_display_settings},
      toDateTime(${createdAtSeconds}), 
      toDateTime(${updatedAtSeconds})
    )
  `.command();
}

export async function deleteProject(id: string): Promise<void> {
  /**
   * FIXME: ClickHouse lacks transaction support here.
   * * Strategy for MVP:
   * 1. Delete the 'project' record first. If this fails, we return an error
   * and stop, ensuring no data is orphaned.
   * 2. If it succeeds, the project is logically deleted (hidden from UI).
   * 3. Attempt to delete massive event tables. If these fail, the data will
   * eventually be cleaned up by the 90-day TTL (MergeTree TTL).
   * * Future: Move to a background worker/queue system for guaranteed cleanup.
   */

  // Step 1: Metadata (Must succeed)
  await sql`DELETE FROM projects WHERE id = ${id}`.command();

  // Step 2: Event Data (Best effort, backed by 90 days TTL)
  await sql`DELETE FROM cwv_events WHERE project_id = ${id}`.command();
  await sql`DELETE FROM custom_events WHERE project_id = ${id}`.command();
  await sql`DELETE FROM cwv_daily_aggregates WHERE project_id = ${id}`.command();
}

export async function resetProjectData(id: string): Promise<void> {
  await sql`DELETE FROM cwv_events WHERE project_id = ${id}`.command();
  await sql`DELETE FROM custom_events WHERE project_id = ${id}`.command();
  await sql`DELETE FROM cwv_daily_aggregates WHERE project_id = ${id}`.command();
}
