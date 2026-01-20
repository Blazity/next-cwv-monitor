import { PageHeaderSkeleton } from "@/components/dashboard/page-header-skeleton";
import {
  ChartSkeleton,
  CoreWebVitalsSkeleton,
  QuickStatsSkeleton,
  WorstRoutesSkeleton,
} from "@/components/dashboard/page-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton title="Overview" description="Monitor Core Web Vitals across all routes" />
      <QuickStatsSkeleton />
      <CoreWebVitalsSkeleton />
      <ChartSkeleton />
      <WorstRoutesSkeleton />
    </div>
  );
}
