import { BAN_REASONS } from '@/app/server/lib/ban-reasons';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

class UsersStatusService {
  async disableAccount(userId: string) {
    await auth.api.banUser({ body: { banReason: BAN_REASONS.disableAccount, userId }, headers: await headers() });
  }

  async enableAccount(userId: string) {
    await auth.api.unbanUser({ body: { userId }, headers: await headers() });
  }
}

export const usersStatusService = new UsersStatusService();
