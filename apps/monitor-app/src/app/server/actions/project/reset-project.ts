'use server';

import { redirectToLogin, getAuthorizedSession, UnauthorizedError } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';
import { projectsResetService } from '@/app/server/domain/projects/reset/service';
import { ActionResponse } from '@/app/server/actions/types';

export async function resetProjectDataAction(projectId: string): Promise<ActionResponse<never>> {
  try {
    await getAuthorizedSession();

    const result = await projectsResetService.execute(projectId);

    if (result.kind === 'ok') {
      revalidatePath(`/projects/${projectId}/settings`);
      return { success: true, message: 'Project data reset.' };
    }

    return { success: false, message: result.message };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return redirectToLogin();
    }

    return { success: false, message: 'An unexpected error occurred.' };
  }
}
