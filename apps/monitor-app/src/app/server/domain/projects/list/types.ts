import type { ProjectRow } from '@/app/server/lib/clickhouse/schema';

export type ListProjectsQuery = {
  limit?: number;
};

export type ListProjectsResult = ProjectRow[];
