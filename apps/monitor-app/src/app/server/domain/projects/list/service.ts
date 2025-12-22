import { listProjects, listProjectsWithViews } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import { ListProjectsResult, ListProjectsWithViewsResult } from '@/app/server/domain/projects/list/types';

export class ProjectsListService {
  async list(): Promise<ListProjectsResult> {
    await getAuthorizedSession();
    return listProjects();
  }

  async listWithViews(): Promise<ListProjectsWithViewsResult> {
    await getAuthorizedSession();
    return listProjectsWithViews();
  }
}

export const projectsService = new ProjectsListService();
