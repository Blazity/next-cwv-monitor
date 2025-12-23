'use client';

import { useRouter } from 'next/navigation';
import { FolderKanban, Globe, Calendar, Eye, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ProjectWithViews } from '@/app/server/lib/clickhouse/schema';

const formatViews = (count: number) => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export function ProjectList({ initialProjects }: { initialProjects: ProjectWithViews[] }) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {initialProjects.map((project) => (
        <Card
          key={project.id}
          className="bg-card border-border hover:border-primary/50 cursor-pointer transition-all"
          onClick={() => router.push(`/projects/${project.id}`)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                  <FolderKanban className="text-primary h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="truncate text-base font-medium">{project.name}</CardTitle>
                  <CardDescription className="mt-0.5 flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <span className="truncate">{project.slug}</span>
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{formatViews(project.trackedViews)} views</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  router.push(`/projects/${project.id}/settings`);
                }}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
