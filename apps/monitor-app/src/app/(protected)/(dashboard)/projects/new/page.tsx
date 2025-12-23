'use client';

import { useEffect } from 'react';
import { useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createProjectAction } from '@/actions/project/create-project';
import { alterProjectSchema, type AlterProjectInput } from '@/app/server/domain/projects/create/schema';

export default function NewProjectPage() {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    control,
    formState: { errors, dirtyFields }
  } = useForm<AlterProjectInput>({
    resolver: arktypeResolver(alterProjectSchema),
    mode: 'onBlur',
    reValidateMode: 'onSubmit',
    defaultValues: {
      name: '',
      slug: ''
    }
  });

  const watchedName = useWatch({ control, name: 'name' });

  useEffect(() => {
    if (!dirtyFields.slug && watchedName) {
      const slugified = watchedName
        .toLowerCase()
        .replaceAll(/[^a-z0-9\s-]/g, '')
        .trim()
        .replaceAll(/\s+/g, '-')
        .replaceAll(/-+/g, '-');

      setValue('slug', slugified, { shouldValidate: true });
    }
  }, [watchedName, dirtyFields.slug, setValue]);

  const onSubmit = (data: AlterProjectInput) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('slug', data.slug);

      const result = await createProjectAction(null, formData);

      if (result.errors) {
        for (const [key, value] of Object.entries(result.errors)) {
          if (value) {
            setError(key as keyof AlterProjectInput, {
              type: 'server',
              message: Array.isArray(value) ? value[0] : value
            });
          }
        }
      }
    });
  };

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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                {...register('name', {
                  onChange: () => {
                    clearErrors('name');
                  }
                })}
                id="project-name"
                placeholder="My Awesome App"
                disabled={isPending}
              />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-domain">Slug</Label>
              <Input
                {...register('slug', {
                  onChange: () => {
                    clearErrors('slug');
                  }
                })}
                id="project-domain"
                placeholder="my-awesome-app"
                disabled={isPending}
              />
              <p className="text-muted-foreground text-xs">
                This will be used in your dashboard URL and API identifiers.
              </p>
              {errors.slug && <p className="text-destructive text-sm">{errors.slug.message}</p>}
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
