/* eslint-disable @eslint-react/no-array-index-key */
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function RegressionsSummarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="bg-card border-border p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-12" />
          </div>
        </div>
      </Card>

      <Card className="bg-card border-border p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-8 w-12" />
          </div>
        </div>
      </Card>

      <Card className="bg-card border-border p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </Card>
    </div>
  );
}

export function RegressionsTableSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-80">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="h-10 w-16 rounded-md" />
      </div>

      <Card className="bg-card border-border gap-0 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-border border-b">
                <th className="px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-4 rounded-sm" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-4 w-4 rounded-sm" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right">
                  <Skeleton className="ml-auto h-3 w-16" />
                </th>
                <th className="px-4 py-3 text-right">
                  <Skeleton className="ml-auto h-3 w-16" />
                </th>
                <th className="px-4 py-3 text-right">
                  <div className="ml-auto flex items-center justify-end gap-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-4 rounded-sm" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right">
                  <div className="ml-auto flex items-center justify-end gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-4 rounded-sm" />
                  </div>
                </th>
                <th className="w-12 px-4" />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-border border-b last:border-0">
                  <td className="max-w-[200px] p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </td>
                  <td className="p-5 text-left">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="p-4 text-right">
                    <Skeleton className="ml-auto h-4 w-14" />
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Skeleton className="h-4 w-14" />
                      <Skeleton className="h-5 w-5 rounded-md" />
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <Skeleton className="ml-auto h-4 w-12" />
                  </td>
                  <td className="p-4 text-right">
                    <Skeleton className="ml-auto h-4 w-10" />
                  </td>
                  <td className="p-4">
                    <Skeleton className="mx-auto h-4 w-4 opacity-20" />
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
    </div>
  );
}
