"use server";

import { resetPasswordService } from "@/app/server/domain/users/reset-password/service";
import { updateTag } from "next/cache";
import { permissionActionClient } from "@/app/server/lib/safe-action";
import { resetPasswordSchema } from "@/app/server/domain/users/reset-password/types";
import { usersSessionService } from "@/app/server/domain/users/session/service";

export const resetPasswordAction = permissionActionClient({ user: ["set-password"] })
  .inputSchema(resetPasswordSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { tempPassword } = await resetPasswordService.execute(parsedInput.userId);
      await usersSessionService.revokeAll(parsedInput.userId);
      updateTag("users");
      return {
        tempPassword,
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  });
