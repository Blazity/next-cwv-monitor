'use server';

import { usersCreateService } from '@/app/server/domain/users/create/service';
import { createUserSchema } from '@/app/server/domain/users/create/types';
import { User } from 'better-auth';
import { updateTag } from 'next/cache';
import { ApiError } from 'next/dist/server/api-utils';
import { type as arkType } from 'arktype';
import { getAuthorizedSession } from '@/app/server/lib/auth-check';

export async function createUserAction(user: Pick<User, 'email' | 'name'>) {
  await getAuthorizedSession();
  const out = createUserSchema(user);
  if (out instanceof arkType.errors) {
    return { success: false, message: 'Invalid user schema' };
  }

  try {
    await usersCreateService.execute(user);
    updateTag('users');
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message };
    }
    return { success: false };
  }
}
