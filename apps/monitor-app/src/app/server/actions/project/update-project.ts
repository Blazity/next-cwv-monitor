'use server';

import { redirectToLogin, getAuthorizedSession, UnauthorizedError } from '@/lib/auth-utils';
import { revalidatePath, updateTag } from 'next/cache';
import { updateProjectNameSchema } from '@/app/server/domain/projects/schema';
import { ArkErrors } from 'arktype';
import { projectsUpdateService } from '@/app/server/domain/projects/update/service';
import { ActionResponse, AlterProjectErrors } from '@/app/server/actions/types';
import { eventDisplaySettingsSchema, EventDisplaySettingsSchema } from '@/app/server/lib/clickhouse/schema';
import { updateTags } from '@/lib/cache';

export async function updateProjectNameAction(
  projectId: string,
  slug: string,
  name: string
): Promise<ActionResponse<AlterProjectErrors>> {
  try {
    await getAuthorizedSession();

    const projectInputValidated = updateProjectNameSchema({ name });
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

    if (result.kind === 'error') {
      return { success: false, message: result.message };
    }

    revalidatePath(`/projects/${projectId}/settings`);
    return { success: true, message: 'Project updated successfully.' };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return redirectToLogin();
    }

    return {
      success: false,
      message: 'An unexpected internal error occurred.'
    };
  }
}

// TODO: consider do not we want to handle it with one generic method
export async function updateProjectEventsSettings({
  eventSettings,
  projectId
}: {
  projectId: string;
  eventSettings: EventDisplaySettingsSchema;
}) {
  try {
    await getAuthorizedSession();

    const projectInputValidated = eventDisplaySettingsSchema.safeParse(eventSettings);
    if (projectInputValidated.error) {
      return {
        success: false,
        message: 'Validation failed.'
      };
    }

    const result = await projectsUpdateService.execute({
      id: projectId,
      events_display_settings: JSON.stringify(eventSettings)
    });

    if (result.kind === 'error') {
      return { success: false, message: result.message };
    }
    updateTag(updateTags.projectDetails(projectId));
    return { success: true, message: 'Project updated successfully.' };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return redirectToLogin();
    }

    return {
      success: false,
      message: 'An unexpected internal error occurred.'
    };
  }
}
