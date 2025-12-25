import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import { deleteUserByEmail } from '@/app/server/lib/clickhouse/repositories/users-repository';
import { updateTag } from 'next/cache';

class UsersDeleteService {
  async execute(userEmail: string) {
    const authorizedUser = await getAuthorizedSession(['admin']);
    if (authorizedUser.user.email === userEmail) {
      return { success: false, message: 'You are not able to remove yourself' };
    }
    await deleteUserByEmail(userEmail);
    updateTag('users');
  }
}

export const usersDeleteService = new UsersDeleteService();
