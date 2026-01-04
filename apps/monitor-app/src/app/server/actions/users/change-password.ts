"use server";

import { authActionClient } from "@/app/server/lib/safe-action";
import { serverChangePasswordSchema } from "@/app/server/domain/users/change-password/types";
import { changePasswordService } from "@/app/server/domain/users/change-password/service";
import { flattenValidationErrors } from "next-safe-action";
import { ForbiddenError } from "@/lib/auth-utils";

export const changePasswordAction = authActionClient
  .inputSchema(serverChangePasswordSchema, {
    handleValidationErrorsShape: async (ve) => flattenValidationErrors(ve).fieldErrors,
  })
  .action(async ({ ctx, parsedInput }) => {
    if (!ctx.session.user.isPasswordTemporary) throw new ForbiddenError();
    return await changePasswordService.execute(parsedInput);
  });
