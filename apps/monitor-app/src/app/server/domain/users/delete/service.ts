import { auth } from '@/lib/auth';
import { updateTag } from 'next/cache';
import { headers } from 'next/headers';

class UsersDeleteService {
  async execute(userId: string) {
    await auth.api.removeUser({ body: { userId }, headers: await headers() });
    updateTag('users');
  }
}

export const usersDeleteService = new UsersDeleteService();
