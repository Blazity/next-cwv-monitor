import { ProjectWithViews } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import type { ProjectRow } from '@/app/server/lib/clickhouse/schema';

export type ListProjectsResult = ProjectRow[];

export type ListProjectsWithViewsResult = ProjectWithViews[];
