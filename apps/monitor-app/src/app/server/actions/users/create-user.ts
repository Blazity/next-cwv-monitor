'use server';

import { usersCreateService } from '@/app/server/domain/users/create/service';
import { InsertUserRow } from '@/app/server/lib/clickhouse/repositories/users-repository';
import { ApiError } from 'next/dist/server/api-utils';
import { AssertionError } from 'node:assert';

export async function createUserAction(user: InsertUserRow) {
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
