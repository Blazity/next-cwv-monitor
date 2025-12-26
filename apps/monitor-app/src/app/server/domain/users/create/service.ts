import { auth } from '@/lib/auth';
import { generateTempPassword } from '@/lib/utils';
import { User } from 'better-auth';

class UsersCreateService {
  async execute(user: Pick<User, 'email' | 'name'>) {
    const tempPassword = generateTempPassword(16);
    await auth.api.createUser({
      body: { email: user.email, name: user.name, password: tempPassword, data: { isPasswordTemporary: true } }
    });
    //TODO: implement sending email
    console.log(tempPassword, 'Temporary password for user');
  }
}

export const usersCreateService = new UsersCreateService();
