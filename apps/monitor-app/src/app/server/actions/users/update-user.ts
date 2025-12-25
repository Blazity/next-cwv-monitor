'use server';

import { SetRole, usersUpdateService } from '@/app/server/domain/users/update/service';
import { updateTag } from 'next/cache';

export async function setRoleAction(payload: SetRole) {
  await usersUpdateService.setRole(payload);
  updateTag('users');
}
