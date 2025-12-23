import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import { getProjectWithViewsById } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import SettingsForm from '@/components/projects/settings-form';
import { notFound } from 'next/navigation';

type ProjectSettingsPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  await getAuthorizedSession();

  const awaitedParams = await params;
  const project = await getProjectWithViewsById(awaitedParams.projectId);

  if (!project) {
    notFound();
  }

  return <SettingsForm project={project} />;
}
