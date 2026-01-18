/* eslint-disable @eslint-react/no-array-index-key */
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function RoutesToolbarSkeleton() {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <Skeleton className="h-9 w-full sm:w-80" />
      <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
        <Skeleton className="h-10 w-18" />
        <Skeleton className="h-10 w-18" />
      </div>
    </div>
  );
}

export function RoutesListSkeleton() {
  return (
    <Card className="bg-card border-border gap-0 overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-border border-b">
              <th className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-4 rounded-sm" />
                </div>
              </th>
              <th className="px-4 py-3">
                <div className="ml-auto flex items-center justify-end gap-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-4 rounded-sm" />
                </div>
              </th>
              <th className="px-4 py-3">
                <div className="ml-auto flex items-center justify-end gap-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-4 rounded-sm" />
                </div>
              </th>
              <th className="w-[200px] px-4 py-3">
                <Skeleton className="mx-auto h-3 w-16" />
              </th>
              <th className="w-12 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-border border-b last:border-0">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
                    <Skeleton className="h-4 w-24 max-w-[80%]" />
                  </div>
                </td>
                <td className="p-4">
                  <Skeleton className="ml-auto h-4 w-10" />
                </td>
                <td className="p-4">
                  <Skeleton className="ml-auto h-4 w-14" />
                </td>
                <td className="p-4">
                  <div className="flex justify-center">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex justify-center">
                    <Skeleton className="h-4 w-4 opacity-20" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t p-4">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </Card>
  );
}

export function RoutesSummarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="bg-card border-border p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
