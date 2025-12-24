'use server';

import { redirectToLogin } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';
import { projectsResetService } from '@/app/server/domain/projects/reset/service';
import { ActionResponse } from '@/actions/types';

export async function resetProjectDataAction(projectId: string): Promise<ActionResponse<never>> {
  const result = await projectsResetService.execute(projectId);

  switch (result.kind) {
    case 'ok': {
      revalidatePath(`/projects/${projectId}/settings`);
      return { success: true, message: 'Project data reset.' };
    }

    case 'error': {
      return { success: false, message: result.message };
    }

    case 'unauthorized': {
      return redirectToLogin();
    }
  }
}
