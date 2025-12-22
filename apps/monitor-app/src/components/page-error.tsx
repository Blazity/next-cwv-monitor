'use client';

import { RefreshCcw } from 'lucide-react';

const handleRefreshPage = () => {
  globalThis.location.reload();
};

// This component is for handling errors that had been thrown on server-side
export function ErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-muted-foreground mb-4 text-xl">Something went wrong</h1>
      <button
        type="button"
        onClick={handleRefreshPage}
        className="text-foreground flex items-center gap-2 text-sm hover:underline"
      >
        <RefreshCcw className="h-4 w-4" />
        Refresh page
      </button>
    </div>
  );
}
