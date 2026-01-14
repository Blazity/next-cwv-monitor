import { ProjectWithViews } from "@/app/server/lib/clickhouse/schema";
import type { ProjectRow } from "@/app/server/lib/clickhouse/schema";

export type ListProjectsResult = ProjectRow[];

export type ListProjectsWithViewsResult = ProjectWithViews[];
