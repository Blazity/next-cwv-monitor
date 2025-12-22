import { EmptyState } from '@/app/(protected)/(dashboard)/projects/empty-state';
import { projectsService } from '@/app/server/domain/projects/list/service';
import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import { ProjectList } from '@/components/dashboard/projects-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default async function ProjectsPage() {
  await getAuthorizedSession();

  const projects = await projectsService.listWithViews();

  const hasProjects = projects.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground text-2xl font-semibold">Projects</h1>
        </div>
        {hasProjects && (
          <Button className="w-fit gap-2" asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4" />
              New project
            </Link>
          </Button>
        )}
      </div>

      {hasProjects ? <ProjectList initialProjects={projects} /> : <EmptyState />}
    </div>
  );
}
