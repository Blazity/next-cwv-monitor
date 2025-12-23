import { Suspense } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { DashboardOverviewService } from '@/app/server/domain/dashboard/overview/service';
import { WorstRoutesByMetric } from '@/components/dashboard/worst-routes-by-metric';
import { TrendChartByMetric } from '@/components/dashboard/trend-chart-by-metric';
import { buildDashboardOverviewQuery } from '@/app/server/domain/dashboard/overview/mappers';
import { cacheLife } from 'next/cache';
import { timeRangeToDateRange } from '@/lib/utils';
import { dashboardSearchParamsSchema } from '@/lib/search-params';
import type { TimeRange } from '@/app/server/domain/dashboard/overview/types';
import type { OverviewDeviceType as DeviceType } from '@/app/server/domain/dashboard/overview/types';

const dashboardOverviewService = new DashboardOverviewService();

async function getCachedOverview(projectId: string, deviceType: DeviceType, timeRange: TimeRange) {
  'use cache';

  cacheLife({
    stale: 300,
    revalidate: 600,
    expire: 86_400
  });

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
  const { timeRange, deviceType } = dashboardSearchParamsSchema.parse(await searchParams);

  const overview = await getCachedOverview(projectId, deviceType, timeRange);

   if (result.kind === 'project-not-found') {
    notFound();
  }

  if (result.kind !== 'ok') {
    throw new Error(`Failed to load dashboard: ${result.kind}`);
  }

  const { worstRoutes, timeSeriesByMetric } = overview.data;

  return (
    <div>
      <PageHeader title="Project" description="Project description" />
      <WorstRoutesByMetric projectId={projectId} metricName="LCP" routes={worstRoutes} />
      <TrendChartByMetric timeSeriesByMetric={timeSeriesByMetric} initialMetric="LCP" />
      <QuickStats
        projectId={projectId}
        selectedMetric={query.selectedMetric}
        data={data.quickStats}
        statusDistribution={data.statusDistribution}
      />

    </div>
  );
}

function ProjectPageLoading() {
  return (
    <div>
      <PageHeader title="Project" description="Project description" />
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
