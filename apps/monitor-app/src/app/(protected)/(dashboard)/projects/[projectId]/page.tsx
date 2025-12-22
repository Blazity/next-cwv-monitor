import { DashboardOverviewService } from '@/app/server/domain/dashboard/overview/service';
import { PageHeader } from '@/components/dashboard/page-header';
import { ErrorPage } from '@/components/page-error';
import { isClickhouseErrorType } from '@/lib/is-clickhouse-error-type';
import { AvailableRange, isValidTimeRange } from '@/lib/time-range';
import { isDeviceType } from '@/lib/utils';
import { addDays } from 'date-fns';
import { notFound } from 'next/navigation';

const dashboardOverviewService = new DashboardOverviewService();

const addDaysValues: Record<AvailableRange, number> = {
  '90d': 90,
  '30d': 30,
  '7d': 7
};

async function ProjectPage({ params, searchParams }: PageProps<'/projects/[projectId]'>) {
  // TODO: handle metric
  const [{ projectId }, { deviceType, timeRange }, selectedMetric = 'LCP'] = await Promise.all([params, searchParams]);
  const validDeviceType = isDeviceType(deviceType) ? deviceType : 'all';
  const validTimeRange = isValidTimeRange(timeRange) ? timeRange : '7d';
  const start = new Date();
  let data;
  try {
    data = await dashboardOverviewService.getOverview({
      deviceType: validDeviceType,
      selectedMetric,
      projectId,
      topRoutesLimit: 5,
      range: { start: start, end: addDays(start, addDaysValues[validTimeRange]) }
    });
  } catch (error) {
    if (isClickhouseErrorType(error, 'CANNOT_PARSE_UUID')) {
      notFound();
    }
    return <ErrorPage />;
  }

  if (data.kind === 'project-not-found') {
    notFound();
  }

  return (
    <div>
      <PageHeader title="Project" description="Project description" />
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default ProjectPage;
