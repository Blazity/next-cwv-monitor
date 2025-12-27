'use client';

import { Route } from 'lucide-react';

type RoutesListEmptyProps = {
  search: string;
};

export function RoutesListEmpty({ search }: RoutesListEmptyProps) {
  const normalizedSearch = search.trim();
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <Route className="text-muted-foreground mb-3 h-8 w-8" />
      <p className="text-muted-foreground text-sm">
        {normalizedSearch ? `No routes matching "${normalizedSearch}"` : 'No routes found'}
      </p>
    </div>
  );
}
