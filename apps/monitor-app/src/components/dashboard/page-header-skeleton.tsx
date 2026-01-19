import { Skeleton } from "@/components/ui/skeleton";
import { type ReactNode } from "react";

type PageHeaderSkeletonProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  showFilters?: boolean;
};

export function PageHeaderSkeleton({ title, description, children, showFilters = true }: PageHeaderSkeletonProps) {
  return (
    <div className="mt-6 flex flex-col gap-2 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-2 transition-all duration-200">
        <div className="flex items-center gap-2">
          <h1 className="text-foreground text-2xl font-semibold">{title}</h1>
          {children}
        </div>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>

      {showFilters && (
        <div className="shrink-0">
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
                <Skeleton className="h-6 w-7 rounded-md sm:h-7 sm:w-15" />
                <Skeleton className="h-6 w-7 rounded-md sm:h-7 sm:w-25" />
                <Skeleton className="h-6 w-7 rounded-md sm:h-7 sm:w-22" />
              </div>
              <Skeleton className="h-8 w-12 rounded-md sm:h-9 sm:w-32" />
            </div>
            <div className="flex items-center gap-2 px-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
