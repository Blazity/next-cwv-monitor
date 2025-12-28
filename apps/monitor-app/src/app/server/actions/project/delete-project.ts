'use server';

import { redirect } from 'next/navigation';
import { projectsDeleteService } from '@/app/server/domain/projects/delete/service';
import { getAuthorizedSession, redirectToLogin, UnauthorizedError } from '@/lib/auth-utils';
import { ActionResponse } from '@/app/server/actions/types';

export async function deleteProjectAction(projectId: string): Promise<ActionResponse<never>> {
  try {
    await getAuthorizedSession();

    const result = await projectsDeleteService.execute(projectId);

    if (result.kind === 'ok') {
      redirect('/projects');
    }

    return { success: false, message: result.message };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return redirectToLogin();
    }

    return { success: false, message: 'An unexpected internal error occurred.' };
  }
}
