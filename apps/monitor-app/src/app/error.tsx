"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="bg-destructive/10 rounded-full p-4">
            <AlertTriangle className="text-destructive h-12 w-12" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-foreground text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
          {error.digest && <p className="text-muted-foreground font-mono text-xs">Error ID: {error.digest}</p>}
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
