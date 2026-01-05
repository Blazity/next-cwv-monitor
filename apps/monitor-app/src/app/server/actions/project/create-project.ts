"use server";

import { redirect } from "next/navigation";
import { permissionActionClient } from "@/app/server/lib/safe-action";
import { projectsCreateService } from "@/app/server/domain/projects/create/service";
import { createProjectSchema } from "@/app/server/domain/projects/create/types";

export const createProjectAction = permissionActionClient({ project: ["create"] })
  .inputSchema(createProjectSchema)
  .action(async ({ parsedInput }) => {
    const result = await projectsCreateService.execute(parsedInput);

    if (result.kind === "already-exists") {
      return {
        success: false,
        errors: { slug: ["This slug is already taken."] },
        message: "Slug conflict.",
      };
    }

    if (result.kind === "error") {
      throw new Error(result.message);
    }
    redirect(`/projects/${result.projectId}`);
  });
