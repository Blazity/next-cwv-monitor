'use server';

import { usersCreateService } from '@/app/server/domain/users/create/service';
import { InsertUserRow } from '@/app/server/lib/clickhouse/repositories/users-repository';

export async function createUserAction(user: InsertUserRow) {
  try {
    await usersCreateService.execute(user);
    return { success: true };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false };
  }
}
