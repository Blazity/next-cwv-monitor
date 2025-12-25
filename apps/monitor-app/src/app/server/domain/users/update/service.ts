import { adminAuth, auth } from '@/lib/auth';
import { headers } from 'next/headers';

export type SetRole = {
  newRole: 'admin' | 'user';
  userId: string;
};

class UsersUpdateService {
  async setRole({ newRole, userId }: SetRole) {
    if (!adminAuth.admin.checkRolePermission({ role: 'admin', permission: { user: ['update'] } })) {
      throw new Error('You cannot update user');
    }
    await auth.api.setRole({
      body: { role: newRole, userId },
      headers: await headers()
    });
  }
}

export const usersUpdateService = new UsersUpdateService();
