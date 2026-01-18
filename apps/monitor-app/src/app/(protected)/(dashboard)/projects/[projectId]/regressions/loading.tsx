import { RegressionsHelpTooltip } from "@/app/(protected)/(dashboard)/projects/[projectId]/regressions/_components/regressions-help-tooltip";
import {
  RegressionsSummarySkeleton,
  RegressionsTableSkeleton,
} from "@/app/(protected)/(dashboard)/projects/[projectId]/regressions/_components/regressions-skeleton";
import { PageHeader } from "@/components/dashboard/page-header";

export default function RegressionsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Regressions" description="Routes with degraded performance compared to the previous period.">
        <RegressionsHelpTooltip />
      </PageHeader>
      <RegressionsSummarySkeleton />
      <RegressionsTableSkeleton />
    </div>
  );
}
