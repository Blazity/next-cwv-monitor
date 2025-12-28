'use server';

import { projectsCreateService } from '@/app/server/domain/projects/create/service';
import { createProjectSchema } from '@/app/server/domain/projects/schema';
import { redirect } from 'next/navigation';
import { ArkErrors } from 'arktype';
import { redirectToLogin, getAuthorizedSession, UnauthorizedError } from '@/lib/auth-utils';
import { ActionResponse, AlterProjectErrors } from '@/app/server/actions/types';

export async function createProjectAction(formData: FormData): Promise<ActionResponse<AlterProjectErrors>> {
  try {
    await getAuthorizedSession();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return redirectToLogin();
    }
    return { success: false, message: 'Authorization failed.' };
  }

  const projectInputValidated = createProjectSchema({
    name: formData.get('name'),
    slug: formData.get('slug')
  });

  if (projectInputValidated instanceof ArkErrors) {
    return {
      success: false,
      errors: projectInputValidated.flatProblemsByPath,
      message: 'Validation failed.'
    };
  }

  let result;
  try {
    result = await projectsCreateService.execute(projectInputValidated);
  } catch {
    return {
      success: false,
      message: 'An unexpected internal error occurred.'
    };
  }

  switch (result.kind) {
    case 'ok': {
      return redirect(`/projects/${result.projectId}`);
    }

    case 'already-exists': {
      return {
        success: false,
        errors: { slug: ['This slug is already taken.'] },
        message: 'Slug conflict.'
      };
    }

    case 'error': {
      return { success: false, message: result.message };
    }
  }
}
