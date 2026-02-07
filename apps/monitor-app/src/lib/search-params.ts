import {
  createSearchParamsCache,
  createSerializer,
  parseAsBoolean,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import { TIME_RANGES, OVERVIEW_DEVICE_TYPES, METRIC_NAMES, SortDirection, INTERVALS } from "@/app/server/domain/dashboard/overview/types";
import { PERCENTILES } from "@/app/server/domain/dashboard/overview/types";
import { REGRESSION_METRIC_NAMES } from "@/app/server/domain/dashboard/regressions/list/types";
import type { RoutesSortField } from "@/app/server/domain/dashboard/routes/list/types";
import type { RegressionsSortField } from "@/app/server/domain/dashboard/regressions/list/types";

export const ROUTES_SORT_FIELDS = ["route", "views", "metric"] as const satisfies RoutesSortField[];
export const REGRESSIONS_SORT_FIELDS = ["route", "metric", "change", "views"] as const satisfies RegressionsSortField[];
export const SORT_DIRECTIONS = ["asc", "desc"] as const satisfies SortDirection[];
const TIME_RANGE_KEYS = TIME_RANGES.map((range) => range.value);
const INTERVAL_KEYS = INTERVALS.map((interval) => interval.value);

export const QUERY_STATE_OPTIONS = {
  shallow: false,
  scroll: false,
  history: "replace",
} as const;

export const SEARCH_QUERY_OPTIONS = {
  ...QUERY_STATE_OPTIONS,
  shallow: true,
} as const;

export const autoRefreshParser = parseAsBoolean.withDefault(false);

export const dashboardSearchParsers = {
  timeRange: parseAsStringLiteral(TIME_RANGE_KEYS).withDefault("7d"),
  interval: parseAsStringLiteral(INTERVAL_KEYS), // No default - server derives from timeRange
  deviceType: parseAsStringLiteral(OVERVIEW_DEVICE_TYPES).withDefault("all"),
  metric: parseAsStringLiteral(METRIC_NAMES).withDefault("LCP"),
  autoRefresh: autoRefreshParser,
};

export const dashboardSearchParamsCache = createSearchParamsCache(dashboardSearchParsers);

export const serializeDashboardParams = createSerializer(dashboardSearchParsers);

export const eventsSearchParamsCache = createSearchParamsCache({
  ...dashboardSearchParsers,
  events: parseAsArrayOf(parseAsString).withDefault([]),
  metric: parseAsStringLiteral(METRIC_NAMES).withDefault("LCP"),
});

export const routesListSearchParsers = {
  search: parseAsString.withDefault(""),
  metric: parseAsStringLiteral(METRIC_NAMES).withDefault("LCP"),
  percentile: parseAsStringLiteral(PERCENTILES).withDefault("p75"),
  sort: parseAsStringLiteral(ROUTES_SORT_FIELDS).withDefault("views"),
  direction: parseAsStringLiteral(SORT_DIRECTIONS).withDefault("desc"),
  page: parseAsInteger.withDefault(1),
};

export const routesSearchParsers = {
  ...dashboardSearchParsers,
  ...routesListSearchParsers,
};

export const routesSearchParamsCache = createSearchParamsCache(routesSearchParsers);

export const routeDetailSearchParsers = {
  ...dashboardSearchParsers,
  metric: routesListSearchParsers.metric,
  percentile: routesListSearchParsers.percentile,
  event: parseAsString.withDefault(""),
};

export const routeDetailSearchParamsCache = createSearchParamsCache(routeDetailSearchParsers);

const REGRESSION_METRIC_FILTERS = ["all", ...REGRESSION_METRIC_NAMES] as const;

export const regressionsListSearchParsers = {
  search: parseAsString.withDefault(""),
  metric: parseAsStringLiteral(REGRESSION_METRIC_FILTERS).withDefault("all"),
  sort: parseAsStringLiteral(REGRESSIONS_SORT_FIELDS).withDefault("change"),
  direction: parseAsStringLiteral(SORT_DIRECTIONS).withDefault("desc"),
  page: parseAsInteger.withDefault(1),
};

export const regressionsSearchParsers = {
  ...dashboardSearchParsers,
  ...regressionsListSearchParsers,
};

export const regressionsSearchParamsCache = createSearchParamsCache(regressionsSearchParsers);
