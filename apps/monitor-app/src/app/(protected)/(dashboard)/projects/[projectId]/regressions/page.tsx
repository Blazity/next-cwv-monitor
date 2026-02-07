import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/dashboard/page-header";
import { RegressionsHelpTooltip } from "@/app/(protected)/(dashboard)/projects/[projectId]/regressions/_components/regressions-help-tooltip";
import { RegressionsList } from "@/app/(protected)/(dashboard)/projects/[projectId]/regressions/_components/regressions-list";
import { RegressionsListService } from "@/app/server/domain/dashboard/regressions/list/service";
import { buildListRegressionsQuery } from "@/app/server/domain/dashboard/regressions/list/mappers";
import { getAuthorizedSession } from "@/lib/auth-utils";
import { regressionsSearchParamsCache } from "@/lib/search-params";
import { timeRangeToDateRange } from "@/lib/utils";
import { CACHE_LIFE_DEFAULT } from "@/lib/cache";
import type { SortDirection, TimeRangeKey } from "@/app/server/domain/dashboard/overview/types";
import type {
  RegressionsMetricFilter,
  RegressionsSortField,
} from "@/app/server/domain/dashboard/regressions/list/types";
import { DeviceFilter } from "@/app/server/lib/device-types";

const regressionsListService = new RegressionsListService();
const PAGE_SIZE = 20;

async function getCachedRegressionsList(
  projectId: string,
  deviceType: DeviceFilter,
  timeRange: TimeRangeKey,
  search: string,
  metric: RegressionsMetricFilter,
  sort: RegressionsSortField,
  direction: SortDirection,
  limit: number,
  offset: number,
) {
  "use cache";
  cacheLife(CACHE_LIFE_DEFAULT);

  const dateRange = timeRangeToDateRange(timeRange);
  const query = buildListRegressionsQuery({
    projectId,
    range: dateRange,
    deviceType,
    search,
    metric,
    sort: { field: sort, direction },
    page: { limit, offset },
  });

  return regressionsListService.list(query);
}

export default async function RegressionsPage({
  params,
  searchParams,
}: PageProps<"/projects/[projectId]/regressions">) {
  const { projectId } = await params;
  const { timeRange, deviceType, search, metric, sort, direction, page } = regressionsSearchParamsCache.parse(
    await searchParams,
  );
  const offset = (page - 1) * PAGE_SIZE;

  await getAuthorizedSession();

  const regressionsResult = await getCachedRegressionsList(
    projectId,
    deviceType,
    timeRange,
    search,
    metric,
    sort,
    direction,
    PAGE_SIZE,
    offset,
  );

  if (regressionsResult.kind === "project-not-found") {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Regressions" description="Routes with degraded performance compared to the previous period.">
        <RegressionsHelpTooltip />
      </PageHeader>

      <RegressionsList
        projectId={projectId}
        data={regressionsResult.data}
        pageSize={PAGE_SIZE}
        appliedMetric={metric}
      />
    </div>
  );
}
