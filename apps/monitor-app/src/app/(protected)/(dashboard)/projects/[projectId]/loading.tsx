import { PageHeader } from "@/components/dashboard/page-header";
import {
  ChartSkeleton,
  CoreWebVitalsSkeleton,
  QuickStatsSkeleton,
  WorstRoutesSkeleton,
} from "@/components/dashboard/page-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Monitor Core Web Vitals across all routes" />
      <QuickStatsSkeleton />
      <CoreWebVitalsSkeleton />
      <ChartSkeleton />
      <WorstRoutesSkeleton />
    </div>
  );
}
