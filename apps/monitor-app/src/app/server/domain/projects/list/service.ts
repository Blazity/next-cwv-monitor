import { listProjects } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import type { ListProjectsResult } from './types';

export class ProjectsListService {
  async list(): Promise<ListProjectsResult> {
    return listProjects();
  }
}
