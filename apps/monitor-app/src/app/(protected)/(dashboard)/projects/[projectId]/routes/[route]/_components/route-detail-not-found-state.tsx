import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import type { UrlObject } from "node:url";

import { Button } from "@/components/ui/button";

type RouteDetailNotFoundStateProps = {
  routesHref: UrlObject;
  route: string;
};

export function RouteDetailNotFoundState({ routesHref, route }: RouteDetailNotFoundStateProps) {
  return (
    <div className="bg-card border-border flex flex-col items-center gap-4 rounded-lg border p-10 text-center">
      <div className="bg-muted rounded-full p-4">
        <FileQuestion className="text-muted-foreground h-10 w-10" />
      </div>
      <div className="space-y-1">
        <h1 className="text-foreground text-lg font-semibold">Route not found</h1>
        <p className="text-muted-foreground text-sm">
          We couldn&apos;t find any data for <span className="font-mono">{route}</span>.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href={routesHref}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to routes
        </Link>
      </Button>
    </div>
  );
}
