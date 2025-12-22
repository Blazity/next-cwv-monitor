import { PageHeader } from '@/components/dashboard/page-header';
import { DashboardOverviewService } from '@/app/server/domain/dashboard/overview/service';
import { WorstRoutesByMetric } from '@/components/dashboard/worst-routes-by-metric';
import { TrendChartByMetric } from '@/components/dashboard/trend-chart-by-metric';
import { buildDashboardOverviewQuery } from '@/app/server/domain/dashboard/overview/mappers';
import { unstable_cache } from 'next/cache';
import { timeRangeToDateRange } from '@/lib/utils';
import { loadDashboardSearchParams } from '@/lib/search-params';
import type { TimeRange } from '@/app/server/domain/dashboard/overview/types';
import type { OverviewDeviceType as DeviceType } from '@/app/server/domain/dashboard/overview/types';

const dashboardOverviewService = new DashboardOverviewService();

const getCachedOverview = unstable_cache(
  async (projectId: string, deviceType: DeviceType, timeRange: TimeRange) => {
    const dateRange = timeRangeToDateRange(timeRange);

    const query = buildDashboardOverviewQuery({
      projectId,
      deviceType,
      range: dateRange
    });

    return dashboardOverviewService.getOverview(query);
  },
  ['dashboard-overview'],
  {
    revalidate: 60
  }
);

async function ProjectPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { projectId } = await params;
  const { timeRange, deviceType } = await loadDashboardSearchParams(searchParams);

  const overview = await getCachedOverview(projectId, deviceType, timeRange);

  if (overview.kind !== 'ok') {
    return (
      <div>
        <PageHeader title="Project" description="Project description" />
        <div>Error: {overview.kind}</div>
      </div>
    );
  }

  const { worstRoutes, timeSeriesByMetric } = overview.data;

  return (
    <div>
      <PageHeader title="Project" description="Project description" />
      <WorstRoutesByMetric projectId={projectId} metricName="LCP" routes={worstRoutes} />
      <TrendChartByMetric timeSeriesByMetric={timeSeriesByMetric} initialMetric="LCP" />
    </div>
  );
}

export default ProjectPage;
