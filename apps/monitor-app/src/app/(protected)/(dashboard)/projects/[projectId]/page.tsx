import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardOverviewService } from "@/app/server/domain/dashboard/overview/service";
import { WorstRoutesByMetric } from "@/components/dashboard/worst-routes-by-metric";
import { TrendChartByMetric } from "@/components/dashboard/trend-chart-by-metric";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { CoreWebVitals } from "@/components/dashboard/core-web-vitals";
import { buildDashboardOverviewQuery } from "@/app/server/domain/dashboard/overview/mappers";
import { cacheLife, cacheTag } from "next/cache";
import { timeRangeToDateRange } from "@/lib/utils";
import { dashboardSearchParamsCache } from "@/lib/search-params";
import { CACHE_LIFE_DEFAULT, updateTags } from "@/lib/cache";
import { getAuthorizedSession } from "@/lib/auth-utils";
import { notFound } from "next/navigation";
import type { IntervalKey, MetricName, TimeRangeKey } from "@/app/server/domain/dashboard/overview/types";
import { getEffectiveInterval } from "@/app/server/domain/dashboard/overview/types";
import { DeviceFilter } from "@/app/server/lib/device-types";

const dashboardOverviewService = new DashboardOverviewService();

async function getCachedOverview(projectId: string, deviceType: DeviceFilter, timeRange: TimeRangeKey, interval: IntervalKey, selectedMetric: MetricName) {
  "use cache";
  cacheLife(CACHE_LIFE_DEFAULT);
  cacheTag(updateTags.dashboardOverview(projectId, deviceType, timeRange, interval, selectedMetric));
  const query = buildDashboardOverviewQuery({ projectId, deviceType, timeRange, interval, selectedMetric });
  return await dashboardOverviewService.getOverview(query);
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getAuthorizedSession();

  const { projectId } = await params;
  const { timeRange, deviceType, interval, metric } = dashboardSearchParamsCache.parse(await searchParams);
  
  const effectiveInterval = getEffectiveInterval(interval, timeRange);
  
  const overview = await getCachedOverview(projectId, deviceType, timeRange, effectiveInterval, metric);

  if (overview.kind === "project-not-found") {
    notFound();
  }

  if (overview.kind !== "ok") {
    throw new Error(`Failed: ${overview.kind}`);
  }

  const { metricOverview, worstRoutes, timeSeriesByMetric, quickStats, statusDistribution } = overview.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Monitor Core Web Vitals across all routes" />
      <QuickStats
        projectId={projectId}
        queriedMetric={metric}
        data={quickStats}
        statusDistribution={statusDistribution}
      />
      <CoreWebVitals metricOverview={metricOverview} />
      <TrendChartByMetric
        data={timeSeriesByMetric[metric]}
        queriedMetric={metric}
        dateRange={timeRangeToDateRange(timeRange)}
        interval={effectiveInterval}
      />
      <WorstRoutesByMetric projectId={projectId} queriedMetric={metric} routes={worstRoutes} />
    </div>
  );
}
