import { RegressionsHelpTooltip } from "@/app/(protected)/(dashboard)/projects/[projectId]/regressions/_components/regressions-help-tooltip";
import {
  RegressionsSummarySkeleton,
  RegressionsTableSkeleton,
} from "@/app/(protected)/(dashboard)/projects/[projectId]/regressions/_components/regressions-skeleton";
import { PageHeaderSkeleton } from "@/components/dashboard/page-header-skeleton";

export default function RegressionsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton title="Regressions" description="Routes with degraded performance compared to the previous period.">
        <RegressionsHelpTooltip />
      </PageHeaderSkeleton>
      <RegressionsSummarySkeleton />
      <RegressionsTableSkeleton />
    </div>
  );
}
