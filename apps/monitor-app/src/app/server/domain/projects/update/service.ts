import { getProjectById, updateProject } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import { UpdatableProjectRow } from '@/app/server/lib/clickhouse/schema';

export type UpdateProjectResult = { kind: 'ok' } | { kind: 'error'; message: string };

export class ProjectsUpdateService {
  async execute(input: Omit<UpdatableProjectRow, 'created_at'>): Promise<UpdateProjectResult> {
    try {
      const current = await getProjectById(input.id);

      if (!current) {
        return { kind: 'error', message: 'Project not found.' };
      }

      if (current.name === input.name) {
        return { kind: 'ok' };
      }
      await updateProject({
        ...input,
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
