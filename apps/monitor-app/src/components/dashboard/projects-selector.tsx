'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Check, ChevronsUpDown, FolderKanban, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { type ListProjectsResult } from '@/app/server/domain/projects/list/types';
import { PersistParamsLink } from '@/components/dashboard/persist-params-link';

type ProjectSelectorProps = {
  projects: ListProjectsResult;
};

export function ProjectSelector({ projects }: ProjectSelectorProps) {
  const pathname = usePathname();
  const params = useParams<{ projectId: string | undefined }>();
  const projectId = params.projectId;
  const currentProject = projectId ? projects.find((project) => project.id === projectId) : null;
  const isProjectScoped = pathname.startsWith('/projects');

  if (!isProjectScoped) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="border-border bg-card hover:bg-accent flex max-w-[180px] items-center gap-2 rounded-md border px-2 py-1.5 text-sm font-medium transition-colors sm:max-w-[220px] sm:px-3">
        <FolderKanban className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="text-foreground truncate">{currentProject?.name || 'Select project'}</span>
        <ChevronsUpDown className="text-muted-foreground h-3 w-3 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">Projects</div>
        {projects.map((project) => (
          <DropdownMenuItem key={project.id} asChild className="cursor-pointer">
            <PersistParamsLink href={`/projects/${project.id}`} className="flex w-full cursor-pointer items-center justify-between">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium">{project.name}</span>
                <span className="text-muted-foreground truncate text-xs">{project.slug}</span>
              </div>
              {currentProject?.id === project.id && <Check className="text-primary h-4 w-4 shrink-0" />}
            </PersistParamsLink>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/projects" className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            <span>View all projects</span>
          </Link>
        </DropdownMenuItem>
        {currentProject && (
          <DropdownMenuItem asChild className="cursor-pointer">
            <PersistParamsLink href={`/projects/${currentProject.id}/settings`} className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>Project settings</span>
            </PersistParamsLink>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
