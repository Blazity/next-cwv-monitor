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
import { normalizeHostname } from "@/lib/utils";
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
        defaultValues: { name: "", domain: "" },
      },
    },
  );

  const {
    register,
    clearErrors,
    control,
    formState: { errors },
  } = form;

  const domainValue = useWatch({ control, name: "domain" });
  const normalizedPreview = normalizeHostname(domainValue);
  const showPreview = domainValue && normalizedPreview && domainValue !== normalizedPreview;

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
        {errors.name?.message && <p className="text-destructive text-sm">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-domain">Project domain</Label>
        <Input
          {...register("domain", { onChange: () => clearErrors("domain") })}
          id="project-domain"
          placeholder="example.com"
          disabled={isPending}
        />
        <p className="text-muted-foreground text-xs">
          The authorized domain for Web Vitals data collection. Requests from other origins will be blocked.
        </p>
        {showPreview && (
          <div className="bg-status-needs-improvement/15 mt-2 flex items-start gap-2 rounded-md border p-2">
            <AlertCircle className="text-status-needs-improvement mt-0.5 h-4 w-4" />
            <div className="text-status-needs-improvement text-xs">
              <p className="font-medium">Standardized as:</p>
              <code className="font-mono break-all">{normalizedPreview}</code>
              <p className="mt-1 opacity-80">We'll strip protocols, paths, and normalize special characters.</p>
            </div>
          </div>
        )}
        {errors.domain?.message && <p className="text-destructive text-sm">{errors.domain.message}</p>}
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
