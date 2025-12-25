import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import { insertUser, InsertUserRow } from '@/app/server/lib/clickhouse/repositories/users-repository';

class UsersCreateService {
  async execute(user: InsertUserRow) {
    // TODO: verify user permissions
    await getAuthorizedSession();
    await insertUser([user]);
  }
}

export const usersCreateService = new UsersCreateService();
