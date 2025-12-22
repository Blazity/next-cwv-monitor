import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Empty, 
  EmptyContent, 
  EmptyDescription, 
  EmptyHeader, 
  EmptyMedia, 
  EmptyTitle 
} from "@/components/ui/empty";

export function EmptyState() {
  return (
    <Empty className="border border-border rounded-lg bg-card">
      <EmptyHeader>
        <EmptyMedia>
          <FolderKanban className="h-10 w-10 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>
          Create your first project to start monitoring Core Web Vitals and track performance across your web applications.
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
  );
}