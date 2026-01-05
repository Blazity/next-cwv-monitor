import { auth } from "@/lib/auth";
import { AUTH_ROLES } from "@/lib/auth-shared";
import { type as arkType } from "arktype";

export type BetterAuthSetRoleBody = NonNullable<Parameters<typeof auth.api.setRole>[0]>["body"];

export const setRoleSchema = arkType({
  userId: "string",
  newRole: arkType
    .enumerated(...AUTH_ROLES)
    .describe("member's role")
    .configure({
      message: (ctx) => `${ctx.propString || "(root)"}: ${ctx.actual} isn't ${ctx.expected}`,
    }),
});

export type SetRole = typeof setRoleSchema.infer;
