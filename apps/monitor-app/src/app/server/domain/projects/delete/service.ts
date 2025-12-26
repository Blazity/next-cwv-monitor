import { deleteProject } from "@/app/server/lib/clickhouse/repositories/projects-repository";

export class ProjectsDeleteService {
    async execute(projectId: string) {
      try {
        await deleteProject(projectId); 
        return { kind: 'ok' as const };
      } catch (error) {
        console.error("Delete Project Service Error:", error);
        return { kind: 'error' as const, message: 'Failed to delete project.' };
      }
    }
}

export const projectsDeleteService = new ProjectsDeleteService();