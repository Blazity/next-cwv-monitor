'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createProjectAction } from '@/actions/create-project';

export default function NewProjectPage() {
  const [state, formAction, isPending] = useActionState(createProjectAction, null);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/projects"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      <Card className="border-border py-6 shadow-sm">
        <CardHeader className="gap-2 px-6">
          <CardTitle className="leading-none font-semibold">Create new project</CardTitle>
          <CardDescription className="text-sm">
            Add a new project to start monitoring its Core Web Vitals performance.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6">
          <form action={formAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input id="project-name" name="name" placeholder="My Awesome App" required disabled={isPending} />
              <p className="text-muted-foreground text-xs">A friendly name to identify your project.</p>
              {state?.errors?.name && <p className="text-destructive text-sm">{state.errors.name[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-domain">Slug</Label>
              <Input id="project-domain" name="slug" placeholder="my-awesome-app" required disabled={isPending} />
              <p className="text-muted-foreground text-xs">
                This will be used in your dashboard URL and API identifiers.
              </p>
              {state?.errors?.slug && <p className="text-destructive text-sm">{state.errors.slug[0]}</p>}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create project
              </Button>

              <Button variant="outline" asChild disabled={isPending}>
                <Link href="/projects">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
