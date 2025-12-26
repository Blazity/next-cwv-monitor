import { createProject, getProjectBySlug } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import { randomUUID } from 'node:crypto';
import { CreateProjectInput } from '@/app/server/domain/projects/schema';

export type CreateProjectResult =
  | { kind: 'ok'; projectId: string }
  | { kind: 'error'; message: string }
  | { kind: 'already-exists'; slug: string };

export class ProjectsCreateService {
  async execute(input: CreateProjectInput): Promise<CreateProjectResult> {
    try {
      const existing = await getProjectBySlug(input.slug);
      if (existing) return { kind: 'already-exists', slug: input.slug };

      const projectId = randomUUID();
      await createProject({
        id: projectId,
        name: input.name,
        slug: input.slug,
      });

      return { kind: 'ok', projectId };
    } catch (error) {
      console.error("Create Project Service Error:", error);
      return { kind: 'error', message: 'Failed to create project' };
    }
  }
}

export const projectsCreateService = new ProjectsCreateService();