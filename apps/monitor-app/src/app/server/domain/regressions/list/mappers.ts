import { SortDirection } from "@/app/server/domain/dashboard/overview/types";
import type {
  DateRange,
  ListRegressionsQuery,
  RegressionsMetricFilter,
  RegressionsSortField,
} from "@/app/server/domain/regressions/list/types";
import { DeviceFilter } from "@/app/server/lib/device-types";

const DEFAULT_RANGE_DAYS = 7;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type SortInput = {
  field?: RegressionsSortField;
  direction?: SortDirection;
};

export type BuildListRegressionsQueryInput = {
  projectId: string;
  range?: Partial<DateRange>;
  deviceType?: DeviceFilter;
  search?: string;
  metric?: RegressionsMetricFilter;
  sort?: SortInput;
  page?: Partial<{ limit: number; offset: number }>;
};

function defaultRange(): DateRange {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - DEFAULT_RANGE_DAYS);
  return { start, end };
}

function normalizeSearch(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function normalizeLimit(value?: number): number {
  const raw = typeof value === "number" ? value : DEFAULT_LIMIT;
  if (!Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(raw)));
}

function normalizeOffset(value?: number): number {
  const raw = typeof value === "number" ? value : 0;
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.floor(raw));
}

function normalizeSort(input?: SortInput): { field: RegressionsSortField; direction: SortDirection } {
  const field = input?.field ?? "change";
  const direction = input?.direction ?? "desc";
  return { field, direction };
}

/**
 * Builds a normalized query DTO for regressions list.
 *
 * Centralizes defaults and basic normalization (pagination/search).
 */
export function buildListRegressionsQuery(input: BuildListRegressionsQueryInput): ListRegressionsQuery {
  const fallback = defaultRange();
  const end = input.range?.end ?? fallback.end;
  const start = input.range?.start ?? fallback.start;

  return {
    projectId: input.projectId,
    range: { start, end },
    deviceType: input.deviceType ?? "all",
    search: normalizeSearch(input.search),
    metric: input.metric ?? "all",
    sort: normalizeSort(input.sort),
    page: {
      limit: normalizeLimit(input.page?.limit),
      offset: normalizeOffset(input.page?.offset),
    },
  };
}
