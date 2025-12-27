import { Suspense } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { DashboardOverviewService } from '@/app/server/domain/dashboard/overview/service';
import { WorstRoutesByMetric } from '@/components/dashboard/worst-routes-by-metric';
import { TrendChartByMetric } from '@/components/dashboard/trend-chart-by-metric';
import { QuickStats } from '@/components/dashboard/quick-stats';
import { buildDashboardOverviewQuery } from '@/app/server/domain/dashboard/overview/mappers';
import { cacheLife } from 'next/cache';
import { timeRangeToDateRange } from '@/lib/utils';
import { dashboardSearchParamsCache } from '@/lib/search-params';
import { CACHE_LIFE_DEFAULT } from '@/lib/cache';
import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import type { TimeRangeKey } from '@/app/server/domain/dashboard/overview/types';
import type { OverviewDeviceType as DeviceType } from '@/app/server/domain/dashboard/overview/types';
import { notFound } from 'next/navigation';
import { CoreWebVitals } from '@/components/dashboard/core-web-vitals';

const dashboardOverviewService = new DashboardOverviewService();

async function getCachedOverview(projectId: string, deviceType: DeviceType, timeRange: TimeRangeKey) {
  'use cache';

  cacheLife(CACHE_LIFE_DEFAULT);

  const dateRange = timeRangeToDateRange(timeRange);

  const query = buildDashboardOverviewQuery({
    projectId,
    deviceType,
    range: dateRange
  });

  return await dashboardOverviewService.getOverview(query);
}

async function ProjectPageContent({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { projectId } = await params;
  const { timeRange, deviceType } = dashboardSearchParamsCache.parse(await searchParams);

  await getAuthorizedSession();

  const overview = await getCachedOverview(projectId, deviceType, timeRange);

  if (overview.kind === 'project-not-found') {
    notFound();
  }

  if (overview.kind !== 'ok') {
    throw new Error(`Failed to load dashboard: ${overview.kind}`);
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
      <CoreWebVitals metricOverview={metricOverview}/>
      <TrendChartByMetric timeSeriesByMetric={timeSeriesByMetric} initialMetric="LCP" />
      <WorstRoutesByMetric projectId={projectId} metricName="LCP" routes={worstRoutes} />
    </div>
  );
}

function ProjectPageLoading() {
  return (
    <div>
      <PageHeader title="Overview" description="Monitor Core Web Vitals across all routes" />
      <div className="mt-6 space-y-6">
        <div className="bg-muted h-64 animate-pulse rounded-lg" />
        <div className="bg-muted h-96 animate-pulse rounded-lg" />
      </div>
    </div>
  );
}

export default function ProjectPage(props: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<ProjectPageLoading />}>
      <ProjectPageContent {...props} />
    </Suspense>
  );
}
