"use client";

import Link from "next/link";
import { arktypeResolver } from "@hookform/resolvers/arktype";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectAction } from "@/app/server/actions/project/create-project";
import { createProjectSchema } from "@/app/server/domain/projects/create/types";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { normalizeHostname } from "@/lib/utils"
import { useWatch } from "react-hook-form";

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
    clearErrors,
    control,
    formState: { errors },
  } = form;

  const slugValue = useWatch({ control, name: "slug" });
  const normalizedPreview = normalizeHostname(slugValue);
  const showPreview = slugValue && normalizedPreview && slugValue !== normalizedPreview;
  
  const isPending = action.isPending;

  return (
    <form onSubmit={handleSubmitWithAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="project-name">Project name</Label>
        <Input
          {...register("name", { onChange: () => clearErrors("name") })}
          id="project-name"
          placeholder="My Awesome App"
          disabled={isPending}
        />
        <p className="text-muted-foreground text-xs">A friendly name to identify your project.</p>
        {errors.name?.message && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-domain">Project domain</Label>
        <Input
          {...register("slug", { onChange: () => clearErrors("slug") })}
          id="project-domain"
          placeholder="example.com"
          disabled={isPending}
        />
        <p className="text-muted-foreground text-xs">The authorized domain for Web Vitals data collection. Requests from other origins will be blocked.</p>
        {showPreview && (
          <div className="flex items-start gap-2 mt-2 p-2 rounded-md border bg-status-needs-improvement/15">
            <AlertCircle className="h-4 w-4 text-status-needs-improvement mt-0.5" />
            <div className="text-xs text-status-needs-improvement">
              <p className="font-medium">Standardized as:</p>
              <code className="font-mono break-all">{normalizedPreview}</code>
              <p className="mt-1 opacity-80">We'll strip protocols, paths, and normalize special characters.</p>
            </div>
          </div>
        )}
        {errors.slug?.message && (
          <p className="text-destructive text-sm">{errors.slug.message}</p>
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
