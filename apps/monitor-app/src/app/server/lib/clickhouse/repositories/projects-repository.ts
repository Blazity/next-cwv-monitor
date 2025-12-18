import { sql } from '@/app/server/lib/clickhouse/client';
import type { InsertableProjectRow, ProjectRow } from '@/app/server/lib/clickhouse/schema';

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
