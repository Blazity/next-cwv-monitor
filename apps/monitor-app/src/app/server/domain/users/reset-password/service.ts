import { auth } from "@/lib/auth";
import { generateTempPassword } from "@/lib/utils";
import { headers } from "next/headers";

class ResetPasswordService {
  async execute(userId: string) {
    const tempPassword = generateTempPassword(16);
    const authHeaders = await headers();

    await auth.api.adminUpdateUser({
      body: {
        userId: userId,
        data: { isPasswordTemporary: true },
      },
      headers: authHeaders,
    });

    try {
      await auth.api.setUserPassword({
        body: { userId, newPassword: tempPassword },
        headers: authHeaders,
      });
    } catch {
      console.error(`Password change failed for user ${userId}. User's password is flagged as temporary.`);
      throw new Error(
        "The user's password was flagged as temporary, but the password update failed. Please try again.",
      );
    }

    return { tempPassword };
  }
}

export const resetPasswordService = new ResetPasswordService();
