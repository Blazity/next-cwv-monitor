"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryStates } from "nuqs";

import { Card } from "@/components/ui/card";
import type { ListRoutesData, RoutesSortField } from "@/app/server/domain/dashboard/routes/list/types";
import type { MetricName, Percentile, SortDirection } from "@/app/server/domain/dashboard/overview/types";
import { QUERY_STATE_OPTIONS, SEARCH_QUERY_OPTIONS, routesListSearchParsers } from "@/lib/search-params";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { RoutesListToolbar } from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/_components/routes-list-toolbar";
import { RoutesListTable } from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/_components/routes-list-table";
import { RoutesListEmpty } from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/_components/routes-list-empty";
import { RoutesListPagination } from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/_components/routes-list-pagination";
import { RoutesStatusSummary } from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/_components/routes-status-summary";
import { getPercentileLabel } from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/_components/routes-list-constants";

const SEARCH_DEBOUNCE_MS = 300;

type RoutesListProps = {
  projectId: string;
  data: ListRoutesData;
  pageSize: number;
  appliedMetric: MetricName;
  appliedPercentile: Percentile;
};

export function RoutesList({ projectId, data, pageSize, appliedMetric, appliedPercentile }: RoutesListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useQueryStates(routesListSearchParsers, QUERY_STATE_OPTIONS);
  const currentPage = Math.max(1, query.page);
  const debouncedSearch = useDebouncedValue(query.search, SEARCH_DEBOUNCE_MS);
  const previousSearchRef = useRef(debouncedSearch);

  const isMetricUpdating = appliedMetric !== query.metric || appliedPercentile !== query.percentile;
  const displayMetric = isMetricUpdating && isPending ? query.metric : appliedMetric;
  const percentileLabel = getPercentileLabel(isMetricUpdating && isPending ? query.percentile : appliedPercentile);
  const totalRoutes = data.totalRoutes;
  const totalPages = Math.max(1, Math.ceil(totalRoutes / pageSize));
  const rangeStart = data.items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = data.items.length === 0 ? 0 : Math.min(currentPage * pageSize, totalRoutes);

  useEffect(() => {
    if (previousSearchRef.current === debouncedSearch) {
      return;
    }
    previousSearchRef.current = debouncedSearch;
    startTransition(() => {
      router.refresh();
    });
  }, [debouncedSearch, router, startTransition]);

  const handleSort = (field: RoutesSortField) => {
    let nextDirection: SortDirection;
    if (query.sort === field) {
      nextDirection = query.direction === "asc" ? "desc" : "asc";
    } else if (field === "route") {
      nextDirection = "asc";
    } else {
      nextDirection = "desc";
    }

    startTransition(() => {
      void setQuery({ sort: field, direction: nextDirection, page: 1 });
    });
  };

  const handlePageChange = (nextPage: number) => {
    startTransition(() => {
      void setQuery({ page: nextPage });
    });
  };

  const handleMetricChange = (value: MetricName) => {
    startTransition(() => {
      void setQuery({ metric: value, page: 1 });
    });
  };

  const handlePercentileChange = (value: Percentile) => {
    startTransition(() => {
      void setQuery({ percentile: value, page: 1 });
    });
  };

  const handleSearchChange = useCallback(
    (value: string) => {
      startTransition(() => {
        void setQuery({ search: value, page: 1 }, SEARCH_QUERY_OPTIONS);
      });
    },
    [setQuery, startTransition],
  );

  const handleRowClick = (route: string) => {
    const qs = searchParams.toString();
    startTransition(() => {
      router.push(
        qs
          ? `/projects/${projectId}/routes/${encodeURIComponent(route)}?${qs}`
          : `/projects/${projectId}/routes/${encodeURIComponent(route)}`,
      );
    });
  };

  return (
    <div className="space-y-6">
      <RoutesListToolbar
        search={query.search}
        onSearchChange={handleSearchChange}
        metric={query.metric}
        onMetricChange={handleMetricChange}
        percentile={query.percentile}
        onPercentileChange={handlePercentileChange}
      />

      <Card className="bg-card border-border gap-0 overflow-hidden p-0">
        <RoutesListTable
          items={data.items}
          metric={displayMetric}
          percentileLabel={percentileLabel}
          sort={{ field: query.sort, direction: query.direction }}
          onSort={handleSort}
          onRowClick={handleRowClick}
          isMetricPending={isMetricUpdating && isPending}
        />

        {data.items.length === 0 && <RoutesListEmpty search={query.search} />}

        <RoutesListPagination
          currentPage={currentPage}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalRoutes={totalRoutes}
          isPending={isPending}
          onPageChange={handlePageChange}
        />
      </Card>

      <RoutesStatusSummary percentileLabel={percentileLabel} statusDistribution={data.statusDistribution} />
    </div>
  );
}
