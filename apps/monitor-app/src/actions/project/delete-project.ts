'use server';

import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import { deleteProject } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import { redirect } from 'next/navigation';

export async function deleteProjectAction(projectId: string) {
  await getAuthorizedSession();
  await deleteProject(projectId);
  redirect('/projects');
}
