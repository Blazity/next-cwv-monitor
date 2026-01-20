import {
  RoutesListSkeleton,
  RoutesSummarySkeleton,
  RoutesToolbarSkeleton,
} from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/_components/routes-skeleton";
import { PageHeader } from "@/components/dashboard/page-header";
import { RouteHelpTooltip } from "@/components/dashboard/route-help-tooltip";

export default function RoutesLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Routes" description="Analyze Core Web Vitals performance by route.">
        <RouteHelpTooltip />
      </PageHeader>
      <RoutesToolbarSkeleton />
      <RoutesListSkeleton />
      <RoutesSummarySkeleton />
    </div>
  );
}
