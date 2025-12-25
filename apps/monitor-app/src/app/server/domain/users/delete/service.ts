import { auth } from '@/lib/auth';
import { updateTag } from 'next/cache';
import { headers } from 'next/headers';

class UsersDeleteService {
  async execute(userEmail: string) {
    const data = await auth.api.listUsers({
      headers: await headers(),
      query: { searchField: 'email', filterOperator: 'contains', searchValue: userEmail.toLocaleLowerCase() }
    });
    if (!data.users[0]) {
      throw new Error('User not found');
    }
    await auth.api.removeUser({ body: { userId: data.users[0].id }, headers: await headers() });
    updateTag('users');
  }
}

export const usersDeleteService = new UsersDeleteService();
