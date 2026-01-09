"use client";

import { TrendingDown } from "lucide-react";

type RegressionsEmptyProps = {
  title: string;
  description: string;
};

export function RegressionsEmpty({ title, description }: RegressionsEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <TrendingDown className="text-muted-foreground mb-3 h-8 w-8" />
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
