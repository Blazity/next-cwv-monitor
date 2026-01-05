import { deleteProject } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { DeleteProjectResult } from "@/app/server/domain/projects/delete/types";

export class ProjectsDeleteService {
  async execute(projectId: string): Promise<DeleteProjectResult> {
    try {
      await deleteProject(projectId);
      return { kind: 'ok' };
    } catch (error) {
      console.error("Delete Project Service Error:", error);
      return { kind: 'error', message: 'Failed to delete project.' };
    }
  }
}

export const projectsDeleteService = new ProjectsDeleteService();