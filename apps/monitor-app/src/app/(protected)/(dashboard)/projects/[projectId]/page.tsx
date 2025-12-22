import { buildDashboardOverviewQuery } from '@/app/server/domain/dashboard/overview/mappers';
import { DashboardOverviewService } from '@/app/server/domain/dashboard/overview/service';
import { isMetricName, isOverviewDeviceType, parseTimeRange } from '@/app/server/domain/dashboard/overview/types';
import { PageHeader } from '@/components/dashboard/page-header';
import { QuickStats } from '@/components/dashboard/quick-stats';
import { notFound } from 'next/navigation';

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams: Promise<{
    deviceType?: string;
    metric?: string;
    timeRange?: string;
  }>;
};

async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { projectId } = await params;

  const queryParams = await searchParams;

  const deviceType = isOverviewDeviceType(queryParams.deviceType) ? queryParams.deviceType : 'all';
  const selectedMetric = isMetricName(queryParams.metric) ? queryParams.metric : 'LCP';
  const range = parseTimeRange(queryParams.timeRange);

  const dashboardService = new DashboardOverviewService();
  const query = buildDashboardOverviewQuery({
    projectId,
    deviceType,
    selectedMetric,
    range
  });
  const result = await dashboardService.getOverview(query);

  if (result.kind === 'project-not-found') {
    notFound();
  }

  if (result.kind !== 'ok') {
    throw new Error(`Failed to load dashboard: ${result.kind}`);
  }

  const { data } = result;

  return (
    <div>
      <PageHeader title="Project" description="Project description" />
      <QuickStats
        projectId={projectId}
        selectedMetric={query.selectedMetric}
        data={data.quickStats}
        statusDistribution={data.statusDistribution}
      />
    </div>
  );
}

export default ProjectPage;
