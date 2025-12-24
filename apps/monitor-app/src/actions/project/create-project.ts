'use server';

import { CreateProjectResult, projectsCreateService } from '@/app/server/domain/projects/create/service';
import { createProjectSchema } from '@/app/server/domain/projects/schema';
import { redirect } from 'next/navigation';
import { ArkErrors } from 'arktype';
import { redirectToLogin } from '@/lib/auth-utils';
import { ActionResponse, AlterProjectErrors } from '@/actions/types';

export async function createProjectAction(formData: FormData) : Promise<ActionResponse<AlterProjectErrors>> {
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

  let result: CreateProjectResult;

  try {
    result = await projectsCreateService.execute(projectInputValidated);
  } catch (error) {
    console.error(error)
    return { 
      success: false, 
      message: 'An unexpected internal error occurred.' 
    };
  }

  switch (result.kind) {
    case 'ok': {
      return redirect(`/projects/${result.projectId}`);
    }
    case 'unauthorized': {
      return redirectToLogin();
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