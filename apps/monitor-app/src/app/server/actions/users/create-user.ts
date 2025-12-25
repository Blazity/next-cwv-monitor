'use server';

import { usersCreateService } from '@/app/server/domain/users/create/service';
import { User } from 'better-auth';
import { ApiError } from 'next/dist/server/api-utils';

export async function createUserAction(user: Pick<User, 'email' | 'name'>) {
  try {
    await usersCreateService.execute(user);
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, message: error.message };
    }
    return { success: false };
  }
}
