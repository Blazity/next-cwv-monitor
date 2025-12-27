import { createSearchParamsCache, parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';
import { TIME_RANGES, OVERVIEW_DEVICE_TYPES } from '@/app/server/domain/dashboard/overview/types';
import { METRIC_NAMES as ROUTES_METRIC_NAMES, PERCENTILES } from '@/app/server/domain/routes/list/types';
import type { RoutesSortField, SortDirection } from '@/app/server/domain/routes/list/types';

export const ROUTES_SORT_FIELDS = ['route', 'views', 'metric'] as const satisfies RoutesSortField[];
export const SORT_DIRECTIONS = ['asc', 'desc'] as const satisfies SortDirection[];
const TIME_RANGE_KEYS = TIME_RANGES.map((range) => range.value);
export const QUERY_STATE_OPTIONS = {
  shallow: false,
  scroll: false,
  history: 'replace'
} as const;
export const SEARCH_QUERY_OPTIONS = {
  ...QUERY_STATE_OPTIONS,
  shallow: true
} as const;
export const SEARCH_DEBOUNCE_MS = 300;

export const dashboardSearchParsers = {
  timeRange: parseAsStringLiteral(TIME_RANGE_KEYS).withDefault('7d'),
  deviceType: parseAsStringLiteral(OVERVIEW_DEVICE_TYPES).withDefault('all')
};

export const dashboardSearchParamsCache = createSearchParamsCache(dashboardSearchParsers);

export const routesListSearchParsers = {
  search: parseAsString.withDefault(''),
  metric: parseAsStringLiteral(ROUTES_METRIC_NAMES).withDefault('LCP'),
  percentile: parseAsStringLiteral(PERCENTILES).withDefault('p75'),
  sort: parseAsStringLiteral(ROUTES_SORT_FIELDS).withDefault('views'),
  direction: parseAsStringLiteral(SORT_DIRECTIONS).withDefault('desc'),
  page: parseAsInteger.withDefault(1)
};

export const routesSearchParsers = {
  ...dashboardSearchParsers,
  ...routesListSearchParsers
};

export const routesSearchParamsCache = createSearchParamsCache(routesSearchParsers);
