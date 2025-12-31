"use server";

import { usersCreateService } from "@/app/server/domain/users/create/service";
import { createUserSchema } from "@/app/server/domain/users/create/types";
import { updateTag } from "next/cache";
import { permissionActionClient } from "@/app/server/lib/safe-action";

export const createUserAction = permissionActionClient({ user: ["create"] })
  .inputSchema(createUserSchema)
  .action(async ({ parsedInput }) => {
    try {
      const { tempPassword } = await usersCreateService.execute(parsedInput);
      updateTag("users");
      return {
        email: parsedInput.email,
        password: tempPassword,
      };
    } catch (error) {
      throw error;
    }
  });
