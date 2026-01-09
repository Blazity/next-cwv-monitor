import { authConfig, emailSchema, nameSchema } from "@/app/server/domain/users/types";
import { auth } from "@/lib/auth";
import { AUTH_ROLES, AuthRole } from "@/lib/auth-shared";
import { type as arkType } from "arktype";

export type BetterAuthCreateUserBody = NonNullable<Parameters<typeof auth.api.createUser>[0]>["body"];
export type CreateUserBody = Omit<BetterAuthCreateUserBody, "role"> & {
  role?: AuthRole | AuthRole[];
};

export const createUserSchema = arkType({
  name: nameSchema,
  email: emailSchema,
  role: arkType.enumerated(...AUTH_ROLES).configure(authConfig),
});
