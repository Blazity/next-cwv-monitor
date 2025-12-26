'use server';

import { SetRole, usersUpdateService } from '@/app/server/domain/users/update/service';
import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import { auth, AuthRole } from '@/lib/auth';
import { assertNever } from '@/lib/utils';
import { updateTag } from 'next/cache';
import { headers } from 'next/headers';

const availableRoles = ['admin', 'member'] as const;
type AvailableRole = (typeof availableRoles)[number];
function isValidRole(role: AuthRole): role is AvailableRole {
  return availableRoles.includes(role);
}

export async function setRoleAction(payload: SetRole) {
  await getAuthorizedSession();
  const role = payload.newRole;
  if (!isValidRole(role)) {
    assertNever(role);
    return { success: false, message: 'Invalid role' };
  }

  const data = await auth.api.listUsers({
    query: { filterOperator: 'eq', filterField: 'id', filterValue: payload.userId },
    headers: await headers()
  });
  if (!data.users[0]) {
    return { success: false, message: 'User does not exist' };
  }
  if (data.users[0].banned) {
    return { success: false, message: 'You cannot change this user role' };
  }

  await usersUpdateService.setRole(payload);
  updateTag('users');
  return { success: true };
}
