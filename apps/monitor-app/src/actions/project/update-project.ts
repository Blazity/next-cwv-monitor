'use server';

import { updateProject } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import { revalidatePath } from 'next/cache';
import { alterProjectSchema } from '@/app/server/domain/projects/create/schema';
import { ArkErrors } from 'arktype';

export async function updateProjectNameAction(projectId: string, formData: FormData) {
  await getAuthorizedSession();
  const projectInputValidated = alterProjectSchema({
    name: formData.get('name'),
    slug: formData.get('slug')
  });

  if (projectInputValidated instanceof ArkErrors) {
    const flatErrors = projectInputValidated.flatProblemsByPath;

    return {
      errors: {
        name: flatErrors.name,
        slug: flatErrors.slug
      },
      message: 'Missing Fields. Failed to Create Project.'
    };
  }

  await updateProject(projectId, projectInputValidated.name, projectInputValidated.slug);
  revalidatePath(`/projects/${projectId}/settings`);
  return { success: true };
}
