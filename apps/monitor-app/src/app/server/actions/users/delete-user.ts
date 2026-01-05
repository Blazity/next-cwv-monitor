"use server";

import { usersDeleteService } from "@/app/server/domain/users/delete/service";
import { deleteUserSchema } from "@/app/server/domain/users/delete/types";
import { updateTag } from "next/cache";
import { permissionActionClient } from "@/app/server/lib/safe-action";
import { usersSessionService } from "@/app/server/domain/users/session/service";

export const deleteUserAction = permissionActionClient({ user: ["delete"] })
  .inputSchema(deleteUserSchema)
  .action(async ({ parsedInput }) => {
    try {
      await usersDeleteService.execute(parsedInput.userId);
      await usersSessionService.revokeAll(parsedInput.userId);
      updateTag("users");
      return { success: true };
    } catch (error) {
      throw error;
    }
  });
