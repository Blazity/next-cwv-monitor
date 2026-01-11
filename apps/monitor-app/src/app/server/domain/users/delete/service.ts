import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/auth-shared";
import { hasAnyRoleOf } from "@/lib/utils";
import { updateTag } from "next/cache";
import { headers } from "next/headers";

class UsersDeleteService {
  async execute(userId: string) {
    const user = await auth.api.listUsers({
      query: { filterField: "id", filterOperator: "eq", filterValue: userId },
      headers: await headers(),
    });
    if (hasAnyRoleOf(user.users[0].role, ADMIN_ROLES)) {
      throw new Error("You can't remove admin");
    }

    await auth.api.removeUser({ body: { userId }, headers: await headers() });
    updateTag("users");
  }
}

export const usersDeleteService = new UsersDeleteService();
