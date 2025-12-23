import { sql } from '@/app/server/lib/clickhouse/client';
import type { InsertableProjectRow, ProjectRow, ProjectWithViews } from '@/app/server/lib/clickhouse/schema';

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
  const rows = await sql<ProjectRow>`
    SELECT id, slug, name, created_at, updated_at
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

export async function updateProject(id: string, name: string, slug: string): Promise<void> {
  const updatedAt = Math.floor(Date.now() / 1000);

  await sql`
    INSERT INTO projects (id, name, slug, updated_at)
    VALUES (${id}, ${name}, ${slug}, toDateTime(${updatedAt}))
  `.command();
}

export async function deleteProject(id: string): Promise<void> {
  await sql`DELETE FROM projects WHERE id = ${id}`.command();
  await sql`DELETE FROM cwv_events WHERE project_id = ${id}`.command();
}

export async function resetProjectData(id: string): Promise<void> {
  await sql`DELETE FROM cwv_events WHERE project_id = ${id}`.command();
  await sql`DELETE FROM custom_events WHERE project_id = ${id}`.command();
  await sql`DELETE FROM cwv_daily_aggregates WHERE project_id = ${id}`.command();
}