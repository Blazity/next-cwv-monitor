'use client';

import Link from 'next/link';
import { FolderX, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProjectNotFound() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="bg-muted rounded-full p-4">
            <FolderX className="text-muted-foreground h-12 w-12" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-foreground text-2xl font-bold">Project not found</h1>
          <p className="text-muted-foreground">
            The project you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
          <Button asChild>
            <Link href="/projects">
              <Home className="mr-2 h-4 w-4" />
              All projects
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
