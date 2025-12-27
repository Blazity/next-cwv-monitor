import { PageHeader } from '@/components/dashboard/page-header';
import { RouteHelpTooltip } from '@/components/dashboard/route-help-tooltip';
import { RoutesListService } from '@/app/server/domain/routes/list/service';
import { buildListRoutesQuery } from '@/app/server/domain/routes/list/mappers';
import { routesSearchParamsCache } from '@/lib/search-params';
import { timeRangeToDateRange } from '@/lib/utils';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import { RoutesList } from '@/app/(protected)/(dashboard)/projects/[projectId]/routes/routes-list';
import { RoutesErrorState } from '@/app/(protected)/(dashboard)/projects/[projectId]/routes/_components/routes-error-state';
import type { TimeRangeKey } from '@/app/server/domain/dashboard/overview/types';
import type {
  MetricName,
  Percentile,
  RoutesDeviceType,
  RoutesSortField,
  SortDirection
} from '@/app/server/domain/routes/list/types';

const routesListService = new RoutesListService();
const PAGE_SIZE = 10;

async function getCachedRoutesList(
  projectId: string,
  deviceType: RoutesDeviceType,
  timeRange: TimeRangeKey,
  search: string,
  metricName: MetricName,
  percentile: Percentile,
  sortField: RoutesSortField,
  sortDirection: SortDirection,
  limit: number,
  offset: number
) {
  'use cache';

  cacheLife({
    stale: 300,
    revalidate: 600,
    expire: 86_400
  });

  const dateRange = timeRangeToDateRange(timeRange);
  const query = buildListRoutesQuery({
    projectId,
    range: dateRange,
    deviceType,
    search,
    metricName,
    percentile,
    sort: { field: sortField, direction: sortDirection },
    page: { limit, offset }
  });

  return routesListService.list(query);
}

export default async function RoutesPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { projectId } = await params;
  const { timeRange, deviceType, search, metric, percentile, sort, direction, page } = routesSearchParamsCache.parse(
    await searchParams
  );
  const offset = (page - 1) * PAGE_SIZE;

  const routesResult = await getCachedRoutesList(
    projectId,
    deviceType,
    timeRange,
    search,
    metric,
    percentile,
    sort,
    direction,
    PAGE_SIZE,
    offset
  );

  if (routesResult.kind === 'project-not-found') {
    notFound();
  }

  const headerDescription =
    routesResult.kind === 'ok'
      ? `Analyze Core Web Vitals performance by route pattern. ${routesResult.data.totalRoutes} routes total.`
      : 'Analyze Core Web Vitals performance by route pattern.';

  if (routesResult.kind === 'unsupported-metric') {
    return (
      <div>
        <PageHeader title="Routes" description={headerDescription}>
          <RouteHelpTooltip />
        </PageHeader>
        <RoutesErrorState message={`Metric "${routesResult.metricName}" is not supported.`} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Routes" description={headerDescription}>
        <RouteHelpTooltip />
      </PageHeader>
      <RoutesList projectId={projectId} data={routesResult.data} pageSize={PAGE_SIZE} />
    </div>
  );
}
