"use server";

import { usersUpdateService } from "@/app/server/domain/users/update/service";
import { setRoleSchema } from "@/app/server/domain/users/update/types";
import { updateTag } from "next/cache";
import { permissionActionClient } from "@/app/server/lib/safe-action";
import { usersSessionService } from "@/app/server/domain/users/session/service";

export const setRoleAction = permissionActionClient({ user: ["set-role"] })
  .inputSchema(setRoleSchema)
  .action(async ({ parsedInput }) => {
    try {
      await usersUpdateService.setRole(parsedInput);
      await usersSessionService.revokeAll(parsedInput.userId);
      updateTag("users");
      return { success: true };
    } catch (error) {
      throw error;
    }
  });
