'use server';
import { usersDeleteService } from '@/app/server/domain/users/delete/service';
import { updateTag } from 'next/cache';

export async function deleteUserAction(userEmail: string) {
  try {
    await usersDeleteService.execute(userEmail);
    updateTag('users');
    return { success: true };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false };
  }
}
