import { getProjectById, updateProject } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { UpdatableProjectRow } from "@/app/server/lib/clickhouse/schema";
import { UpdateProjectResult } from "@/app/server/domain/projects/update/types";

export class ProjectsUpdateService {
  async execute(input: Omit<UpdatableProjectRow, "created_at">): Promise<UpdateProjectResult> {
    try {
      const current = await getProjectById(input.id);

      if (!current) {
        return { kind: "error", message: "Project not found." };
      }

      const existingSettings = current.events_display_settings ? JSON.parse(current.events_display_settings) : {};

      const incomingSettings = input.events_display_settings ? JSON.parse(input.events_display_settings) : {};

      const mergedSettings = JSON.stringify({
        ...existingSettings,
        ...incomingSettings,
      });

      const hasChanged =
        input.name !== current.name ||
        input.slug !== current.slug ||
        JSON.stringify(mergedSettings) !== JSON.stringify(current.events_display_settings);

      if (!hasChanged) {
        return { kind: "ok" };
      }

      await updateProject({
        ...current,
        ...input,
        events_display_settings: mergedSettings,
      });

      return { kind: "ok" };
    } catch (error) {
      console.error("Update Project Service Error:", error);
      return { kind: "error", message: "Failed to update project." };
    }
  }
}

export const projectsUpdateService = new ProjectsUpdateService();
