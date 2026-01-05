"use client";

import Link from "next/link";
import { arktypeResolver } from "@hookform/resolvers/arktype";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectAction } from "@/app/server/actions/project/create-project";
import { createProjectSchema } from "@/app/server/domain/projects/create/types";
import { capitalizeFirstLetter } from "@/lib/utils";
import { toast } from "sonner";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .trim()
    .replaceAll(/\s+/g, "-")
    .replaceAll(/-+/g, "-");

export function NewProjectForm() {

  const { form, action, handleSubmitWithAction } = useHookFormAction(
    createProjectAction,
    arktypeResolver(createProjectSchema),
    {
      actionProps: {
        onSuccess: () => {
          toast.success("Project created successfully");
        },
        onError: ({ error }) => {
          if (error.serverError) {
            toast.error(error.serverError);
          }
        },
      },
      formProps: {
        mode: "onBlur",
        defaultValues: { name: "", slug: "" },
      },
    }
  );

  const {
    register,
    setValue,
    clearErrors,
    formState: { errors, dirtyFields },
  } = form;

  const isPending = action.isPending;

  return (
    <form onSubmit={handleSubmitWithAction} className="space-y-6">
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
        <p className="text-muted-foreground text-xs">This will be used in your dashboard URL and API identifiers.</p>
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
