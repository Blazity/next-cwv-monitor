import { auth } from "@/lib/auth";
import { AUTH_ROLES, AuthRole } from "@/lib/auth-shared";
import { type as arkType } from "arktype";

export type BetterAuthCreateUserBody = NonNullable<Parameters<typeof auth.api.createUser>[0]>["body"];
export type CreateUserBody = Omit<BetterAuthCreateUserBody, "role"> & {
  role?: AuthRole | AuthRole[];
};

export const createUserSchema = arkType({
  name: arkType("string >= 1")
    .describe("not empty")
    .configure({ actual: () => "" }),
  email: arkType("string.email")
    .describe("a valid email address")
    .configure({ actual: () => "" }),
  role: arkType
    .enumerated(...AUTH_ROLES)
    .describe("member's role")
    .configure({ message: (ctx) => `${ctx.propString || "(root)"}: ${ctx.actual} isn't ${ctx.expected}` }),
});
