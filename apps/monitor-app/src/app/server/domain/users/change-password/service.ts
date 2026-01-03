import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import type { ChangePasswordData } from "@/app/server/domain/users/change-password/types";

class ChangePasswordService {
  async execute(data: ChangePasswordData) {
    try {
      const authHeaders = await headers();

      // 1. Change the password
      const response = await auth.api.changePassword({
        headers: authHeaders,
        body: {
          newPassword: data.newPassword,
          currentPassword: data.currentPassword,
          revokeOtherSessions: false,
        },
        asResponse: true,
      });

      const result = await response.json();

      if (result.user) {
        await (await auth.$context).internalAdapter.updateUser(result.user.id, {
          isPasswordTemporary: false,
        });

        result.user.isPasswordTemporary = false;

        const cookieStore = await cookies();
        const sessionCookieName = "better-auth.session_data";

        const sessionData = JSON.stringify({
          user: result.user,
          session: result.session,
        });
        
        const base64Session = Buffer.from(sessionData).toString("base64");

        cookieStore.set(sessionCookieName, base64Session, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
      }

      return { success: true };
    } catch (error) {
      console.error("ChangePassword Error:", error);
      throw error;
    }
  }
}

export const changePasswordService = new ChangePasswordService();