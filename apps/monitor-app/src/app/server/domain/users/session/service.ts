import { auth } from "@/lib/auth";
import { headers } from "next/headers";

class UsersSessionService {
  async revokeAll(userId: string) {
    await auth.api.revokeUserSessions({
      body: { userId },
      headers: await headers(),
    });
  }
}

export const usersSessionService = new UsersSessionService();
