import { projectsListService } from "@/app/server/domain/projects/list/service";
import { ProjectList } from "@/components/projects/projects-list";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { getAuthorizedSession } from "@/lib/auth-utils";
import { FolderKanban, Plus } from "lucide-react";
import Link from "next/link";

export default async function ProjectsPage() {
  await getAuthorizedSession();

  const projects = await projectsListService.listWithViews();

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

      {hasProjects ? (
        <ProjectList initialProjects={projects} />
      ) : (
        <Empty className="border-border bg-card rounded-lg border">
          <EmptyHeader>
            <EmptyMedia>
              <FolderKanban className="text-muted-foreground h-10 w-10" />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create your first project to start monitoring Core Web Vitals and track performance across your web
              applications.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button className="gap-2" asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4" />
                Create your first project
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
