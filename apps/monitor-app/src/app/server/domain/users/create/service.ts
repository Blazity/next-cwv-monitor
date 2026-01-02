import { auth } from "@/lib/auth";
import { generateTempPassword } from "@/app/server/lib/password";
import { BetterAuthCreateUserBody, CreateUserBody } from "@/app/server/domain/users/create/types";
import { headers } from "next/headers";

class UsersCreateService {
  async execute(user: Pick<CreateUserBody, "email" | "name" | "role">) {
    const tempPassword = generateTempPassword(16);
    await auth.api.createUser({
      body: {
        email: user.email,
        name: user.name,
        password: tempPassword,
        role: user.role as BetterAuthCreateUserBody["role"],
        data: { isPasswordTemporary: true },
      },
      headers: await headers(),
    });
    //TODO: implement sending email
    return { tempPassword };
  }
}

export const usersCreateService = new UsersCreateService();
