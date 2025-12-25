import { getProjectById, updateProject } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { getAuthorizedSession } from "@/lib/auth-utils";
import { UpdateProjectNameInput } from "@/app/server/domain/projects/schema";

export type UpdateProjectResult = 
  | { kind: 'ok' }
  | { kind: 'error'; message: string }
  | { kind: 'unauthorized' };

  export class ProjectsUpdateService {
    async execute(input: UpdateProjectNameInput & {slug: string; id: string;}): Promise<UpdateProjectResult> {
      try {
        const session = await getAuthorizedSession();
        if (session.kind === "unauthorized") return { kind: 'unauthorized' };
  
        const current = await getProjectById(input.id);
        if (!current) return { kind: 'error', message: 'Project not found.' };
  
        if (current.name === input.name) {
          return { kind: 'ok' };
        }
        
      await updateProject({id: input.id, name: input.name, slug: input.slug, created_at:current.created_at});
        return { kind: 'ok' };
      } catch (error) {
        console.error("Update Service Error:", error);
        return { kind: 'error', message: 'Failed to update project name.' };
      }
    }
  }

export const projectsUpdateService = new ProjectsUpdateService();