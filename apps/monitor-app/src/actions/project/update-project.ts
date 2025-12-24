'use server';

import { redirectToLogin } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';
import { updateProjectNameSchema } from '@/app/server/domain/projects/schema';
import { ArkErrors } from 'arktype';
import { projectsUpdateService } from '@/app/server/domain/projects/update/service';
import { ActionResponse, AlterProjectErrors } from '@/actions/types';

export async function updateProjectNameAction(
  projectId: string, 
  slug: string,
  formData: FormData
): Promise<ActionResponse<AlterProjectErrors>> {
  const projectInputValidated = updateProjectNameSchema({
    name: formData.get('name')
  });

  if (projectInputValidated instanceof ArkErrors) {
    return {
      success: false,
      errors: projectInputValidated.flatProblemsByPath,
      message: 'Validation failed.'
    };
  }

  const result = await projectsUpdateService.execute({
    id: projectId,
    slug,
    ...projectInputValidated
  });

  switch (result.kind) {
    case 'ok': {
      revalidatePath(`/projects/${projectId}/settings`);
      return { success: true, message: 'Project updated successfully.' };
    }
    
    case 'error': {
      return { success: false, message: result.message };
    }
      
    case 'unauthorized': {
      return redirectToLogin();
    }
  }
}
