'use server';

import { redirect } from 'next/navigation';
import { projectsDeleteService } from '@/app/server/domain/projects/delete/service';
import { redirectToLogin } from '@/lib/auth-utils';
import { ActionResponse } from '@/actions/types';

export async function deleteProjectAction(projectId: string): Promise<ActionResponse<never>> {
  const result = await projectsDeleteService.execute(projectId);

  switch (result.kind) {
    case 'ok': {
      redirect('/projects');
    } 
    case 'error': {
      return { success: false, message: result.message };
    }
    case 'unauthorized': {
      return redirectToLogin();
    }
  }

}