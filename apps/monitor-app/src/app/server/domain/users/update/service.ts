import { auth, AuthRole } from '@/lib/auth';
import { headers } from 'next/headers';

export type SetRole = {
  newRole: AuthRole;
  userId: string;
};

class UsersUpdateService {
  async setRole({ newRole, userId }: SetRole) {
    await auth.api.setRole({
      // FIXME: better-auth has problems with infering types, let's assert it to first available value
      body: { role: newRole as 'user', userId },
      headers: await headers()
    });
  }
}

export const usersUpdateService = new UsersUpdateService();
