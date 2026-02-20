import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardOverviewService } from "@/app/server/domain/dashboard/overview/service";
import { WorstRoutesByMetric } from "@/components/dashboard/worst-routes-by-metric";
import { TrendChartByMetric } from "@/components/dashboard/trend-chart-by-metric";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { CoreWebVitals } from "@/components/dashboard/core-web-vitals";
import { buildDashboardOverviewQuery } from "@/app/server/domain/dashboard/overview/mappers";
import { cacheLife, cacheTag } from "next/cache";
import { dashboardSearchParamsCache } from "@/lib/search-params";
import { CACHE_LIFE_DEFAULT, updateTags } from "@/lib/cache";
import { getAuthorizedSession } from "@/lib/auth-utils";
import { notFound } from "next/navigation";

const dashboardOverviewService = new DashboardOverviewService();

async function getCachedOverview(projectId: string, params: Awaited<ReturnType<typeof dashboardSearchParamsCache.parse>>) {
  "use cache";
  const query = buildDashboardOverviewQuery({
    projectId,
    timeRange: params.timeRange,
    interval: params.interval ?? undefined,
    deviceType: params.deviceType,
    selectedMetric: params.metric,
    customStart: params.from,
    customEnd: params.to,
  });

  cacheLife(CACHE_LIFE_DEFAULT);
  cacheTag(updateTags.dashboardOverview(query));

  const result = await dashboardOverviewService.getOverview(query);
  return { result, query };
}

export default async function ProjectPage({
  params,
  searchParams,
}: PageProps<"/projects/[projectId]">) {
  await getAuthorizedSession();

  const { projectId } = await params;
  const parsedParams = dashboardSearchParamsCache.parse(await searchParams);
  
  const { result: overview, query } = await getCachedOverview(projectId, parsedParams);

  if (overview.kind === "project-not-found") {
    notFound();
  }

  if (overview.kind !== "ok") {
    throw new Error(`Failed: ${overview.kind}`);
  }

  const { data } = overview;

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Monitor Core Web Vitals across all routes" />
      <QuickStats
        projectId={projectId}
        queriedMetric={query.selectedMetric}
        data={data.quickStats}
        statusDistribution={data.statusDistribution}
      />
      <CoreWebVitals metricOverview={data.metricOverview} />
      <TrendChartByMetric
        data={data.timeSeriesByMetric[query.selectedMetric]}
        dateRange={query.range}
        interval={query.interval}
      />
      <WorstRoutesByMetric projectId={projectId} queriedMetric={query.selectedMetric} routes={data.worstRoutes} />
    </div>
  );
}
