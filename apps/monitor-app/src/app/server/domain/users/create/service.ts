import { adminAuth, auth } from '@/lib/auth';
import { generateTempPassword } from '@/lib/utils';
import { User } from 'better-auth';
import { updateTag } from 'next/cache';

class UsersCreateService {
  async execute(user: Pick<User, 'email' | 'name'>) {
    adminAuth.admin.checkRolePermission({
      role: 'admin',
      permission: { user: ['delete'] }
    });
    const tempPassword = generateTempPassword(16);
    await auth.api.createUser({
      body: { email: user.email, name: user.name, password: tempPassword }
    });
    updateTag('users');
  }
}

export const usersCreateService = new UsersCreateService();
