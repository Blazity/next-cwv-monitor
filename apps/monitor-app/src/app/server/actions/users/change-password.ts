"use server";

import { actionClient } from "@/app/server/lib/safe-action";
import { serverChangePasswordSchema } from "@/app/server/domain/users/change-password/types";
import { changePasswordService } from "@/app/server/domain/users/change-password/service";
import { flattenValidationErrors } from "next-safe-action";

export const changePasswordAction = actionClient
  .inputSchema(serverChangePasswordSchema, {
    handleValidationErrorsShape: async (ve) => flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ parsedInput }) => {
    return await changePasswordService.execute(parsedInput);
  });
