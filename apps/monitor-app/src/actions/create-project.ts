'use server';

import { CreateProjectService } from '@/app/server/domain/projects/create/service';
import { createProjectSchema } from '@/app/server/domain/projects/create/schema';
import { redirect } from 'next/navigation';
import { ArkErrors } from 'arktype';

type ProjectState = {
  errors?: {
    name?: string;
    slug?: string;
  };
  message?: string | null;
} | null;

export async function createProjectAction(_prevState: ProjectState, formData: FormData) {
  const projectInputValidated = createProjectSchema({
    name: formData.get('name'),
    slug: formData.get('slug')
  });

  if (projectInputValidated instanceof ArkErrors) {
    const flatErrors = projectInputValidated.flatProblemsByPath;

    return {
      errors: {
        name: flatErrors.name[0],
        slug: flatErrors.slug[0]
      },
      message: 'Missing Fields. Failed to Create Project.'
    };
  }

  const service = new CreateProjectService();
  const result = await service.execute(projectInputValidated);

  switch (result.kind) {
    case 'already-exists': {
      return {
        errors: { slug: 'This slug is already taken.' },
        message: 'Slug conflict.'
      };
    }
    case 'error': {
      return {
        message: result.message
      };
    }
    case 'ok': {
      break;
    }
    default: {
      return { message: 'An unexpected error occurred.' };
    }
  }

  redirect(`/projects/${result.projectId}`);
}
