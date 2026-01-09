import { PageHeader } from "@/components/dashboard/page-header";

export default function RegressionsLoading() {
  return (
    <div>
      <PageHeader title="Regressions" description="Routes with degraded performance compared to the previous period." />
      <div className="mt-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-muted h-24 w-full animate-pulse rounded-lg" />
          <div className="bg-muted h-24 w-full animate-pulse rounded-lg" />
          <div className="bg-muted h-24 w-full animate-pulse rounded-lg" />
        </div>
        <div className="bg-muted h-10 w-full animate-pulse rounded-lg sm:h-12" />
        <div className="bg-muted h-96 w-full animate-pulse rounded-lg" />
      </div>
    </div>
  );
}
