import {
  createProject,
  getProjectByDomain as getProjectByDomain,
} from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { randomUUID } from "node:crypto";
import { CreateProjectInput, CreateProjectResult } from "@/app/server/domain/projects/create/types";

export class ProjectsCreateService {
  async execute(input: CreateProjectInput): Promise<CreateProjectResult> {
    try {
      const existing = await getProjectByDomain(input.domain);
      if (existing) return { kind: "already-exists", domain: input.domain };

      const projectId = randomUUID();
      await createProject({
        id: projectId,
        name: input.name,
        domain: input.domain,
      });

      return { kind: "ok", projectId };
    } catch (error) {
      console.error("Create Project Service Error:", error);
      return { kind: "error", message: "Failed to create project" };
    }
  }
}

export const projectsCreateService = new ProjectsCreateService();
