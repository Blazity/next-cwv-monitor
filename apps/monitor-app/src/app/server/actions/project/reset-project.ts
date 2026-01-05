"use server";
import { revalidatePath } from "next/cache";
import { projectsResetService } from "@/app/server/domain/projects/reset/service";
import { resetProjectSchema } from "@/app/server/domain/projects/reset/types";
import { permissionActionClient } from "@/app/server/lib/safe-action";

export const resetProjectDataAction = permissionActionClient({ project: ["reset"] })
  .inputSchema(resetProjectSchema)
  .action(async ({ parsedInput }) => {
    const { projectId } = parsedInput;

    const result = await projectsResetService.execute(projectId);

    if (result.kind === "error") {
      throw new Error(result.message);
    }

    revalidatePath(`/projects/${projectId}/settings`);
    return {
      success: true,
      message: "Project data reset successfully.",
    };
  });
