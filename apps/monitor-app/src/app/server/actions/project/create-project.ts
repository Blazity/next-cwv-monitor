"use server";

import { redirect } from "next/navigation";
import { permissionActionClient } from "@/app/server/lib/safe-action";
import { projectsCreateService } from "@/app/server/domain/projects/create/service";
import { createProjectSchema } from "@/app/server/domain/projects/create/types";
import { updateTag } from "next/cache";
import { updateTags } from "@/lib/cache";

export const createProjectAction = permissionActionClient({ project: ["create"] })
  .inputSchema(createProjectSchema)
  .action(async ({ parsedInput }) => {
    const result = await projectsCreateService.execute(parsedInput);

    if (result.kind === "already-exists") {
      return {
        success: false,
        errors: { domain: ["This domain is already taken."] },
        message: "Domain conflict.",
      };
    }

    if (result.kind === "error") {
      throw new Error(result.message);
    }
    updateTag(updateTags.projectDetails(result.projectId));
    redirect(`/projects/${result.projectId}`);
  });
