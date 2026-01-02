import { PageHeader } from '@/components/dashboard/page-header';
import { DashboardOverviewService } from '@/app/server/domain/dashboard/overview/service';
import { WorstRoutesByMetric } from '@/components/dashboard/worst-routes-by-metric';
import { TrendChartByMetric } from '@/components/dashboard/trend-chart-by-metric';
import { QuickStats } from '@/components/dashboard/quick-stats';
import { CoreWebVitals } from '@/components/dashboard/core-web-vitals';
import { buildDashboardOverviewQuery } from '@/app/server/domain/dashboard/overview/mappers';
import { cacheLife } from 'next/cache';
import { timeRangeToDateRange } from '@/lib/utils';
import { dashboardSearchParamsCache } from '@/lib/search-params';
import { CACHE_LIFE_DEFAULT } from '@/lib/cache';
import { getAuthorizedSession } from '@/lib/auth-utils';
import { notFound } from 'next/navigation';
import type { OverviewDeviceType as DeviceType, TimeRangeKey } from '@/app/server/domain/dashboard/overview/types';

const dashboardOverviewService = new DashboardOverviewService();

async function getCachedOverview(projectId: string, deviceType: DeviceType, timeRange: TimeRangeKey) {
  'use cache';
  cacheLife(CACHE_LIFE_DEFAULT);
  const dateRange = timeRangeToDateRange(timeRange);
  const query = buildDashboardOverviewQuery({ projectId, deviceType, range: dateRange });
  return await dashboardOverviewService.getOverview(query);
}

export default async function ProjectPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getAuthorizedSession();

  const { projectId } = await params;
  const { timeRange, deviceType } = dashboardSearchParamsCache.parse(await searchParams);
  const overview = await getCachedOverview(projectId, deviceType, timeRange);

  if (overview.kind === 'project-not-found') {
    notFound();
  }

  if (overview.kind !== 'ok') {
    throw new Error(`Failed: ${overview.kind}`);
  }

  const { metricOverview, worstRoutes, timeSeriesByMetric, quickStats, statusDistribution } = overview.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Monitor Core Web Vitals across all routes" />
      <QuickStats
        projectId={projectId}
        selectedMetric="LCP"
        data={quickStats}
        statusDistribution={statusDistribution}
      />
      <CoreWebVitals metricOverview={metricOverview} />
      <TrendChartByMetric timeSeriesByMetric={timeSeriesByMetric} initialMetric="LCP" />
      <WorstRoutesByMetric projectId={projectId} metricName="LCP" routes={worstRoutes} />
    </div>
  );
}
