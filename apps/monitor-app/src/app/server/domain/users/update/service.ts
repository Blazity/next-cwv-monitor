import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SetRole, BetterAuthSetRoleBody } from "@/app/server/domain/users/update/types";

class UsersUpdateService {
  async setRole({ newRole, userId }: SetRole) {
    const user = await auth.api.listUsers({
      query: { filterOperator: "eq", filterField: "id", filterValue: userId },
      headers: await headers(),
    });

    if (!user.users[0]) throw new Error("User does not exist");
    if (user.users[0].banned) throw new Error("You cannot change this user role");

    await auth.api.setRole({
      body: {
        role: newRole as BetterAuthSetRoleBody["role"],
        userId,
      },
      headers: await headers(),
    });
  }
}

export const usersUpdateService = new UsersUpdateService();
