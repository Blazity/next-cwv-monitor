import { createSafeActionClient } from "next-safe-action";
import { ensurePermission, getAuthorizedSession, redirectToLogin, UnauthorizedError } from "@/lib/auth-utils";
import { auth } from "@/lib/auth";

function isNextRedirectError(value: unknown): value is { digest: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "digest" in value &&
    typeof (value as { digest: unknown }).digest === "string" &&
    (value as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function isNextNotFoundError(value: unknown): value is { digest: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "digest" in value &&
    typeof (value as { digest: unknown }).digest === "string" &&
    (value as { digest: string }).digest.startsWith("NEXT_NOT_FOUND")
  );
}

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    if (isNextRedirectError(e) || isNextNotFoundError(e)) throw e;
    return e instanceof Error ? e.message || "An unexpected error occurred." : "An unexpected error occurred.";
  },
});

export const authActionClient = actionClient.use(async ({ next }) => {
  let session;
  try {
    session = await getAuthorizedSession();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return redirectToLogin();
    }
    throw error;
  }

  return next({ ctx: { session } });
});

type UserHasPermissionBody = NonNullable<Parameters<typeof auth.api.userHasPermission>[0]>["body"];
export type Permission = Extract<UserHasPermissionBody, { permission: unknown }>["permission"];

export const permissionActionClient = (permission: Permission) =>
  authActionClient.use(async ({ next, ctx }) => {
    const userId = ctx.session.user.id;
    await ensurePermission(permission, userId);

    return next({ ctx });
  });
