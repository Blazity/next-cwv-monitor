'use server';
import { usersDeleteService } from '@/app/server/domain/users/delete/service';
import { APIError } from 'better-auth';
import { updateTag } from 'next/cache';

export async function deleteUserAction(userId: string) {
  try {
    if (!userId) {
      throw new Error('Userid is required');
    }

    await usersDeleteService.execute(userId);
    updateTag('users');
    return { success: true };
  } catch (error) {
    if (error instanceof APIError || error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false };
  }
}
