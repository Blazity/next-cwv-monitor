import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthorizedSession } from "@/lib/auth-utils";
import { NewProjectForm } from "@/app/(protected)/(dashboard)/projects/new/new-project-form";

export default async function NewProjectPage() {
  await getAuthorizedSession();

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
          <NewProjectForm />
        </CardContent>
      </Card>
    </div>
  );
}
