"use server";

import { revalidatePath, updateTag } from "next/cache";
import { permissionActionClient } from "@/app/server/lib/safe-action";
import { projectsUpdateService } from "@/app/server/domain/projects/update/service";
import { updateTags } from "@/lib/cache";
import { updateProjectSchema } from "@/app/server/domain/projects/update/types";

export const updateProjectAction = permissionActionClient({ project: ["update"] })
  .inputSchema(updateProjectSchema)
  .action(async ({ parsedInput }) => {
    const { projectId, slug, name, eventSettings } = parsedInput;

    const result = await projectsUpdateService.execute({
      id: projectId,
      ...(slug && { slug }),
      ...(name && { name }),
      ...(eventSettings && { events_display_settings: eventSettings }),
    });

    if (result.kind === "error") {
      throw new Error(result.message);
    }

    updateTag(updateTags.projectDetails(projectId));
    revalidatePath(`/projects/${projectId}/settings`);

    return { success: true, message: "Project updated successfully." };
  });
