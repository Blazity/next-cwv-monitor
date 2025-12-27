"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";

import { Card } from "@/components/ui/card";
import type {
  ListRoutesData,
  MetricName,
  Percentile,
  RoutesSortField,
  SortDirection,
} from "@/app/server/domain/routes/list/types";
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
};

export function RoutesList({ projectId, data, pageSize }: RoutesListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useQueryStates(routesListSearchParsers, QUERY_STATE_OPTIONS);
  const currentPage = Math.max(1, query.page);
  const debouncedSearch = useDebouncedValue(query.search, SEARCH_DEBOUNCE_MS);
  const previousSearchRef = useRef(debouncedSearch);

  const percentileLabel = getPercentileLabel(query.percentile);
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
    startTransition(() => {
      router.push(`/projects/${projectId}/routes/${encodeURIComponent(route)}`);
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
          metric={query.metric}
          percentileLabel={percentileLabel}
          sort={{ field: query.sort, direction: query.direction }}
          onSort={handleSort}
          onRowClick={handleRowClick}
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
