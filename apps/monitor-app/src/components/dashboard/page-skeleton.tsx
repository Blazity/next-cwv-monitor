/* eslint-disable @eslint-react/no-array-index-key */
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function QuickStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-4 w-4" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="px-6 pb-3">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-5 px-6">
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-3 w-28" />
        </CardContent>
      </Card>
    </div>
  );
}

export function CoreWebVitalsSkeleton() {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    </section>
  );
}

function MetricCardSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-2">
          <Skeleton className="mt-1 h-5 w-32" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </CardHeader>

      <CardContent>
        <div className="mb-4 flex items-baseline gap-1">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-8" />
        </div>

        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export function ChartSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-7 w-36" />

          <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-12 rounded-md" />
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-2 pr-2 pl-5">
            <div className="flex h-[300px] flex-col justify-between">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
              ))}
            </div>

            <div className="border-border relative h-[300px] flex-1">
              <div className="absolute inset-0 flex flex-col justify-between py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="border-border/50 h-px w-full border-t border-dashed" />
                ))}
              </div>
              <Skeleton className="h-full w-full opacity-5" />
            </div>
          </div>

          <div className="flex justify-between pr-2 pl-10">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="border-status-good h-px w-8 border-t border-dashed" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <div className="border-status-poor h-px w-8 border-t border-dashed" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function WorstRoutesSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-32 sm:w-48" />
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      </CardHeader>

      <CardContent className="px-3 sm:px-6">
        <div className="space-y-1 sm:space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg p-2 sm:p-3">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <Skeleton className="h-4 w-4 shrink-0 rounded" />
                  <Skeleton className="h-4 w-40 sm:w-64" />
                  <div className="ml-auto flex items-center gap-1.5 sm:hidden">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-5 w-8 rounded-full" />
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-2 pl-6 sm:justify-end sm:gap-4 sm:pl-0">
                  <Skeleton className="h-3 w-16" />
                  <div className="hidden items-center gap-1.5 sm:flex">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-5 w-8 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
