'use server';

import { usersStatusService } from '@/app/server/domain/users/status/service';
import { checkBanReason } from '@/app/server/lib/ban-reasons';
import { getAuthorizedSession } from '@/lib/auth-utils';
import { APIError } from 'better-auth';
import { updateTag } from 'next/cache';

export async function toggleAccountStatusAction(userId: string, currentStatus?: string | null) {
  await getAuthorizedSession();
  try {
    if (!userId) {
      throw new Error('Userid is required');
    }

    const isDisabledForToggleReason = checkBanReason(currentStatus, 'disableAccount');

    if (currentStatus && !isDisabledForToggleReason) {
      return { success: false, message: 'User is disabled for a different reason' };
    }
    await (isDisabledForToggleReason
      ? usersStatusService.enableAccount(userId)
      : usersStatusService.disableAccount(userId));

    updateTag('users');
    return { success: true };
  } catch (error) {
    if (error instanceof APIError || error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false };
  }
}
