import { listProjects } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import type { ListProjectsResult } from './types';
import { requireAuth } from '@/app/server/lib/auth-check';

export class ProjectsListService {
  async list(): Promise<ListProjectsResult> {
    await requireAuth();
    return listProjects();
  }
}
