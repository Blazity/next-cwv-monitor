'use server';

import { SetRole, usersUpdateService } from '@/app/server/domain/users/update/service';
import { auth } from '@/lib/auth';
import { updateTag } from 'next/cache';
import { headers } from 'next/headers';

export async function setRoleAction(payload: SetRole) {
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
