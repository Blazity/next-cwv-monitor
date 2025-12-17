import { listProjects } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import type { ListProjectsQuery, ListProjectsResult } from './types';

export class ProjectsListService {
  async list(query: ListProjectsQuery = {}): Promise<ListProjectsResult> {
    const limit = query.limit ?? 50;
    return listProjects(limit);
  }
}
