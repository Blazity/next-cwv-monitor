import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { APIError } from "better-auth";
import type { LoginData } from "@/app/server/domain/users/login/types";

class ChangePasswordService {
  async execute(data: LoginData) {
    try {
      const response = await auth.api.signInEmail({
        headers: await headers(),
        body: {
          email: data.email,
          password: data.password,
        },
      });
      return response;
    } catch (error) {
      if (!(error instanceof APIError)) console.error("Login Error:", error);
      throw error;
    }
  }
}

export const usersLoginService = new ChangePasswordService();
