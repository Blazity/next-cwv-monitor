import { resetProjectData } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { ResetProjectResult } from "@/app/server/domain/projects/reset/types";

export class ProjectsResetService {
  async execute(projectId: string): Promise<ResetProjectResult> {
    try {
      await resetProjectData(projectId);
      return { kind: "ok" };
    } catch (error) {
      console.error("Reset Project Service Error:", error);
      return { kind: "error", message: "Failed to reset project data." };
    }
  }
}

export const projectsResetService = new ProjectsResetService();
