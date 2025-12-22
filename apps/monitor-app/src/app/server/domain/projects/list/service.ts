import { listProjects } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { getAuthorizedSession } from "@/app/server/lib/auth-check";
import { ListProjectsResult } from "@/app/server/domain/projects/list/types";

export class ProjectsListService {
  async list(): Promise<ListProjectsResult> {
    await getAuthorizedSession();
    return listProjects();
  }
}
