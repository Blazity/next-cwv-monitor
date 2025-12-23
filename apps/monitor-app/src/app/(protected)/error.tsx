'use client'; // Error boundaries must be Client Components

import { RefreshCcw } from 'lucide-react';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-muted-foreground mb-4 text-xl">Something went wrong</h1>
      <button type="button" onClick={reset} className="text-foreground flex items-center gap-2 text-sm hover:underline">
        <RefreshCcw className="h-4 w-4" />
        Refresh page
      </button>
    </div>
  );
}
