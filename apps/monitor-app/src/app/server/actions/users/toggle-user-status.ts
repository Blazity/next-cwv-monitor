"use server";

import { usersStatusService } from "@/app/server/domain/users/status/service";
import { toggleStatusSchema } from "@/app/server/domain/users/status/types";
import { checkBanReason } from "@/app/server/lib/ban-reasons";
import { updateTag } from "next/cache";
import { permissionActionClient } from "@/app/server/lib/safe-action";
import { usersSessionService } from "@/app/server/domain/users/session/service";

export const toggleAccountStatusAction = permissionActionClient({ user: ["update"] })
  .inputSchema(toggleStatusSchema)
  .action(async ({ parsedInput }) => {
    const { userId, currentStatus } = parsedInput;

    const isDisabledForToggleReason = checkBanReason(currentStatus, "disableAccount");

    if (currentStatus && !isDisabledForToggleReason) {
      return { success: false, message: "User is disabled for a different reason" };
    }

    try {
      await (isDisabledForToggleReason
        ? usersStatusService.enableAccount(userId)
        : usersStatusService.disableAccount(userId));
      await usersSessionService.revokeAll(parsedInput.userId);
      updateTag("users");
      return { success: true };
    } catch (error) {
      throw error;
    }
  });
