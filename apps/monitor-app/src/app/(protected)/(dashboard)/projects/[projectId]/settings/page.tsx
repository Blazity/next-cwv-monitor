import { getAuthorizedSession, hasPermission } from "@/lib/auth-utils";
import { getProjectWithViewsById } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import SettingsForm from "@/components/projects/settings/settings-form";
import { notFound } from "next/navigation";

type ProjectSettingsPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const session = await getAuthorizedSession();

  const awaitedParams = await params;
  const project = await getProjectWithViewsById(awaitedParams.projectId);

  const [canUpdate, canReset, canDelete] = await Promise.all([
    hasPermission({ project: ["update"] }, session.user.id),
    hasPermission({ project: ["reset"] }, session.user.id),
    hasPermission({ project: ["delete"] }, session.user.id),
  ]);

  if (!project) {
    notFound();
  }

  return <SettingsForm project={project} permissions={{ canUpdate, canReset, canDelete }} />;
}
