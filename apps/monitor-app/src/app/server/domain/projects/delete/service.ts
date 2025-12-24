import { deleteProject } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { getAuthorizedSession } from "@/lib/auth-utils";

export class ProjectsDeleteService {
    async execute(projectId: string) {
      try {
        const session = await getAuthorizedSession();
        if (session.kind === "unauthorized") return { kind: 'unauthorized' as const };
  
        await deleteProject(projectId);
        return { kind: 'ok' as const };
      } catch (error) {
        console.error("Delete Service Error:", error);
        return { kind: 'error' as const, message: 'Failed to delete project.' };
      }
    }
}

export const projectsDeleteService = new ProjectsDeleteService();