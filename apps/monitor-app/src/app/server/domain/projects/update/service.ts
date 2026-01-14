import { getProjectById, updateProject } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { eventDisplaySettingsSchema, UpdatableProjectRow } from "@/app/server/lib/clickhouse/schema";
import { UpdateProjectResult } from "@/app/server/domain/projects/update/types";
import { ArkErrors } from "arktype";

export class ProjectsUpdateService {
  async execute(input: Omit<UpdatableProjectRow, "created_at">): Promise<UpdateProjectResult> {
    try {
      const current = await getProjectById(input.id);

      if (!current) {
        return { kind: "error", message: "Project not found." };
      }

      const existingParsed = eventDisplaySettingsSchema(current.events_display_settings);
      const existingSettings = existingParsed instanceof ArkErrors || existingParsed === null ? {} : existingParsed;

      const incomingParsed = eventDisplaySettingsSchema(input.events_display_settings ?? null);
      const incomingSettings = incomingParsed instanceof ArkErrors || incomingParsed === null ? {} : incomingParsed;

      const mergedSettingsObject = {
        ...existingSettings,
        ...incomingSettings,
      };

      const hasChanged =
        input.name !== current.name ||
        input.domain !== current.domain ||
        JSON.stringify(mergedSettingsObject) !== JSON.stringify(existingSettings);

      if (!hasChanged) {
        return { kind: "ok" };
      }

      await updateProject({
        ...current,
        ...input,
        events_display_settings: mergedSettingsObject,
      });

      return { kind: "ok" };
    } catch (error) {
      console.error("Update Project Service Error:", error);
      return { kind: "error", message: "Failed to update project." };
    }
  }
}

export const projectsUpdateService = new ProjectsUpdateService();
