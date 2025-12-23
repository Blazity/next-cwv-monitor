'use server';

import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import { resetProjectData } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import { revalidatePath } from 'next/cache';

export async function resetProjectDataAction(projectId: string) {
  await getAuthorizedSession();

  try {
    await resetProjectData(projectId);
    revalidatePath(`/projects/${projectId}/settings`);
    return { success: true };
  } catch {
    return { error: 'Failed to reset project data' };
  }
}
