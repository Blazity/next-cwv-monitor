import { GetDashboardOverviewQuery } from "@/app/server/domain/dashboard/overview/types";
import { getProjectById } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { cacheTag } from "next/cache";

export const CACHE_LIFE_DEFAULT = {
  stale: 30,
  revalidate: 30,
  // Next.js requires expire > revalidate.
  expire: 31,
} as const;

export const updateTags = {
  projectDetails: (projectId: string) => `project-${projectId}` as const,
  dashboardOverview: (q: GetDashboardOverviewQuery) => 
    `overview-${q.projectId}-${q.deviceType}-${q.selectedMetric}-${q.interval}-${q.range.start.getTime()}-${q.range.end.getTime()}`
};

export async function getCachedProject(projectId: string) {
  "use cache";
  cacheTag(updateTags.projectDetails(projectId));
  return getProjectById(projectId);
}
