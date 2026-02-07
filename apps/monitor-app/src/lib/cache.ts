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
  dashboardOverview: (projectId: string, deviceType: string, timeRange: string, interval: string, selectedMetric: string, customStart: string, customEnd: string) => 
    `overview-${projectId}-${deviceType}-${timeRange}-${interval}-${selectedMetric}-${customStart}-${customEnd}` as const,
};

export async function getCachedProject(projectId: string) {
  "use cache";
  cacheTag(updateTags.projectDetails(projectId));
  return getProjectById(projectId);
}
