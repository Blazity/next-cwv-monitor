import {
  RoutesListSkeleton,
  RoutesSummarySkeleton,
  RoutesToolbarSkeleton,
} from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/_components/routes-skeleton";
import { PageHeaderSkeleton } from "@/components/dashboard/page-header-skeleton";
import { RouteHelpTooltip } from "@/components/dashboard/route-help-tooltip";

export default function RoutesLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton title="Routes" description="Analyze Core Web Vitals performance by route.">
        <RouteHelpTooltip />
      </PageHeaderSkeleton>
      <RoutesToolbarSkeleton />
      <RoutesListSkeleton />
      <RoutesSummarySkeleton />
    </div>
  );
}
