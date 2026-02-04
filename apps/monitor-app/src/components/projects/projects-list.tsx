import Link from "next/link";
import { FolderKanban, Globe, Calendar, Eye, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ProjectWithViews } from "@/app/server/lib/clickhouse/schema";
import { formatDate } from "@/lib/utils";

const formatViews = (count: number) => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export function ProjectList({ initialProjects }: { initialProjects: ProjectWithViews[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {initialProjects.map((project) => (
        <Card key={project.id} className="bg-card border-border hover:border-primary/50 relative transition-all">
          <Link href={`/projects/${project.id}`} className="absolute inset-0 z-0">
            <span className="sr-only">View {project.name}</span>
          </Link>

          <CardHeader className="pb-3">
            <div className="flex w-full min-w-0 items-start justify-between">
              <div className="flex w-full min-w-0 items-center gap-3">
                <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <FolderKanban className="text-primary h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="truncate text-base font-medium">{project.name}</CardTitle>
                  <CardDescription className="mt-0.5 flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <span className="truncate">{project.domain}</span>
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
                  <span>{formatDate(project.created_at)}</span>
                </div>
              </div>

              <Link href={`/projects/${project.id}/settings`} className="relative z-10">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <div>
                    <Settings className="h-4 w-4" />
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
