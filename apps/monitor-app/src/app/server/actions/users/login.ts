"use server";

import { actionClient } from "@/app/server/lib/safe-action";
import { loginSchema } from "@/app/server/domain/users/login/types";
import { usersLoginService } from "@/app/server/domain/users/login/service";

export const loginAction = actionClient.inputSchema(loginSchema).action(async ({ parsedInput }) => {
  return usersLoginService.execute(parsedInput);
});
