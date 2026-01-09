import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { ChangePasswordData } from "@/app/server/domain/users/change-password/types";
import { APIError } from "better-auth";

class ChangePasswordService {
  async execute(data: ChangePasswordData) {
    try {
      await auth.api.changePassword({
        headers: await headers(),
        body: { ...data, revokeOtherSessions: true },
      });

      return { success: true };
    } catch (error) {
      if (!(error instanceof APIError)) console.error("ChangePassword Error:", error);
      throw error;
    }
  }
}

export const usersChangePasswordService = new ChangePasswordService();
