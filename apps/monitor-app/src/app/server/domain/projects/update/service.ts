import { getProjectById, updateProject } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import { UpdateProjectNameInput } from '@/app/server/domain/projects/schema';

export type UpdateProjectResult = { kind: 'ok' } | { kind: 'error'; message: string };

export class ProjectsUpdateService {
  async execute(input: UpdateProjectNameInput & { slug: string; id: string }): Promise<UpdateProjectResult> {
    try {
      const current = await getProjectById(input.id);

      if (!current) {
        return { kind: 'error', message: 'Project not found.' };
      }

      if (current.name === input.name) {
        return { kind: 'ok' };
      }

      await updateProject({
        id: input.id,
        name: input.name,
        slug: input.slug,
        created_at: current.created_at
      });

      return { kind: 'ok' };
    } catch (error) {
      console.error('Update Project Service Error:', error);
      return { kind: 'error', message: 'Failed to update project name.' };
    }
  }
}

export const projectsUpdateService = new ProjectsUpdateService();
