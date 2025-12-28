import type {
  DateRange,
  ListRoutesQuery,
  MetricName,
  Percentile,
  RoutesDeviceType,
  RoutesSortField,
  SortDirection
} from '@/app/server/domain/routes/list/types';

const DEFAULT_RANGE_DAYS = 7;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type SortInput = {
  field?: RoutesSortField;
  direction?: SortDirection;
};

export type BuildListRoutesQueryInput = {
  projectId: string;
  range?: Partial<DateRange>;
  deviceType?: RoutesDeviceType;
  search?: string;
  metricName?: MetricName;
  percentile?: Percentile;
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
  const raw = typeof value === 'number' ? value : DEFAULT_LIMIT;
  if (!Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(raw)));
}

function normalizeOffset(value?: number): number {
  const raw = typeof value === 'number' ? value : 0;
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.floor(raw));
}

function normalizeSort(input?: SortInput): { field: RoutesSortField; direction: SortDirection } {
  const field = input?.field ?? 'views';
  const direction = input?.direction ?? 'desc';
  return { field, direction };
}

/**
 * Builds a normalized query DTO for routes list.
 *
 * Centralizes defaults and basic normalization (pagination/search).
 */
export function buildListRoutesQuery(input: BuildListRoutesQueryInput): ListRoutesQuery {
  const fallback = defaultRange();
  const end = input.range?.end ?? fallback.end;
  const start = input.range?.start ?? fallback.start;

  return {
    projectId: input.projectId,
    range: { start, end },
    deviceType: input.deviceType ?? 'all',
    search: normalizeSearch(input.search),
    metricName: input.metricName ?? 'LCP',
    percentile: input.percentile ?? 'p75',
    sort: normalizeSort(input.sort),
    page: {
      limit: normalizeLimit(input.page?.limit),
      offset: normalizeOffset(input.page?.offset)
    }
  };
}

