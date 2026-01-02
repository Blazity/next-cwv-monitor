import { createSafeActionClient } from 'next-safe-action';
import { ForbiddenError, getAuthorizedSession } from '@/lib/auth-utils';
import { auth } from '@/lib/auth';

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    return e.message || 'An unexpected error occurred.';
  }
});

export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await getAuthorizedSession();

  return next({ ctx: { session } });
});

type UserHasPermissionBody = NonNullable<Parameters<typeof auth.api.userHasPermission>[0]>['body'];
export type Permission = Extract<UserHasPermissionBody, { permission: unknown }>['permission'];

export const permissionActionClient = (permission: Permission) =>
  authActionClient.use(async ({ next, ctx }) => {
    const userId = ctx.session.user.id;

    const { success } = await auth.api.userHasPermission({
      body: {
        userId,
        permission
      }
    });

    if (!success) {
      throw new ForbiddenError();
    }

    return next({ ctx });
  });
