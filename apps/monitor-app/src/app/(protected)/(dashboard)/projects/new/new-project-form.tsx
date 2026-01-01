"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { arktypeResolver } from "@hookform/resolvers/arktype";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectAction } from "@/app/server/actions/project/create-project";
import { createProjectSchema, type CreateProjectInput } from "@/app/server/domain/projects/create/types";
import { capitalizeFirstLetter } from "@/lib/utils";

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .trim()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-+/g, "-");

export function NewProjectForm() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateProjectInput>({
    resolver: arktypeResolver(createProjectSchema),
    mode: "onBlur",
    defaultValues: { name: "", slug: "" },
  });

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors, dirtyFields },
  } = form;

  const applyServerErrors = (serverErrors: Record<string, string | string[]>) => {
    for (const [key, value] of Object.entries(serverErrors)) {
      setError(key as keyof CreateProjectInput, {
        type: "server",
        message: Array.isArray(value) ? value[0] : value,
      });
    }
  };

  const onSubmit = (data: CreateProjectInput) => {
    startTransition(async () => {
      const formData = new FormData();
      for (const [key, val] of Object.entries(data)) formData.append(key, val);

      const result = await createProjectAction(formData);
      if (result.errors) {
        applyServerErrors(result.errors);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="project-name">Project name</Label>
        <Input
          {...register("name", {
            onChange: (e) => {
              clearErrors("name");
              if (!dirtyFields.slug) {
                setValue("slug", slugify(e.target.value), { shouldValidate: true });
              }
            },
          })}
          id="project-name"
          placeholder="My Awesome App"
          disabled={isPending}
        />
        <p className="text-muted-foreground text-xs">A friendly name to identify your project.</p>
        {errors.name?.message && (
          <p className="text-destructive text-sm">{capitalizeFirstLetter(errors.name.message)}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-domain">Slug</Label>
        <Input
          {...register("slug", { onChange: () => clearErrors("slug") })}
          id="project-domain"
          placeholder="my-awesome-app"
          disabled={isPending}
        />
        <p className="text-muted-foreground text-xs">
          This will be used in your dashboard URL and API identifiers.
        </p>
        {errors.slug?.message && (
          <p className="text-destructive text-sm">{capitalizeFirstLetter(errors.slug.message)}</p>
        )}
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
  );
}
