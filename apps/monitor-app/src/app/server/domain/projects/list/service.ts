import { listProjects, listProjectsWithViews } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { getServerSessionDataOrRedirect } from "@/lib/auth-utils";
import { cache } from "react";

export const projectsListService = {
  list: cache(async () => {
    await getServerSessionDataOrRedirect();
    return listProjects();
  }),

  listWithViews: cache(async () => {
    await getServerSessionDataOrRedirect();
    return listProjectsWithViews();
  }),
} as const;
