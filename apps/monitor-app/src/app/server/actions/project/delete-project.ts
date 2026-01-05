"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { permissionActionClient } from "@/app/server/lib/safe-action";
import { projectsDeleteService } from "@/app/server/domain/projects/delete/service";
import { deleteProjectSchema } from "@/app/server/domain/projects/delete/types";

export const deleteProjectAction = permissionActionClient({ project: ["delete"] })
  .inputSchema(deleteProjectSchema)
  .action(async ({ parsedInput }) => {
    const { projectId } = parsedInput;

    const result = await projectsDeleteService.execute(projectId);

    if (result.kind === "error") {
      throw new Error(result.message);
    }

    revalidatePath("/projects");
    redirect("/projects");
  });
