'use client';

import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="bg-muted rounded-full p-4">
            <FileQuestion className="text-muted-foreground h-12 w-12" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-foreground text-4xl font-bold">404</h1>
          <h2 className="text-foreground text-xl font-medium">Page not found</h2>
          <p className="text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
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
