import { Suspense } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { DashboardOverviewService } from '@/app/server/domain/dashboard/overview/service';
import { WorstRoutesByMetric } from '@/components/dashboard/worst-routes-by-metric';
import { TrendChartByMetric } from '@/components/dashboard/trend-chart-by-metric';
import { QuickStats } from '@/components/dashboard/quick-stats';
import { buildDashboardOverviewQuery } from '@/app/server/domain/dashboard/overview/mappers';
import { timeRangeToDateRange } from '@/lib/utils';
import { dashboardSearchParamsSchema } from '@/lib/search-params';
import { notFound } from 'next/navigation';
import { OverviewDeviceType, TimeRangeKey } from '@/app/server/domain/dashboard/overview/types';
import { cacheLife } from 'next/cache';

const dashboardOverviewService = new DashboardOverviewService();

async function getCachedOverview(projectId: string, deviceType: OverviewDeviceType, timeRange: TimeRangeKey) {
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
  let overview;
  try {
    overview = await getCachedOverview(projectId, deviceType, timeRange);
  } catch {
    notFound();
  }

  if (overview.kind === 'project-not-found') {
    notFound();
  }

  if (overview.kind !== 'ok') {
    throw new Error(`Failed to load dashboard: ${overview.kind}`);
  }

  const { worstRoutes, timeSeriesByMetric, quickStats, statusDistribution } = overview.data;

  return (
    <div>
      <PageHeader title="Project" description="Project description" />
      <QuickStats
        projectId={projectId}
        selectedMetric="LCP"
        data={quickStats}
        statusDistribution={statusDistribution}
      />
      <WorstRoutesByMetric projectId={projectId} metricName="LCP" routes={worstRoutes} />
      <TrendChartByMetric timeSeriesByMetric={timeSeriesByMetric} initialMetric="LCP" />
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
