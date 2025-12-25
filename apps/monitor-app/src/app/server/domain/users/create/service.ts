import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import { InsertUserRow } from '@/app/server/lib/clickhouse/repositories/users-repository';
import { auth } from '@/lib/auth';
import { generateTempPassword } from '@/lib/utils';
import { updateTag } from 'next/cache';

class UsersCreateService {
  async execute(user: InsertUserRow) {
    await getAuthorizedSession(['admin']);
    const tempPassword = generateTempPassword(16);
    await auth.api.signUpEmail({
      returnHeaders: false,
      asResponse: true,
      returnStatus: false,
      headers: {},
      body: { email: user.email, name: user.name, password: tempPassword }
    });
    updateTag('users');
    // TODO: sending email
  }
}

export const usersCreateService = new UsersCreateService();
