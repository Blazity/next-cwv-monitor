"use client";

import { useEffect, useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";

import { Card } from "@/components/ui/card";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { QUERY_STATE_OPTIONS, SEARCH_QUERY_OPTIONS, regressionsListSearchParsers } from "@/lib/search-params";
import { RegressionsSummaryCards } from "@/app/(protected)/(dashboard)/projects/[projectId]/regressions/_components/regressions-summary-cards";
import { RegressionsToolbar } from "@/app/(protected)/(dashboard)/projects/[projectId]/regressions/_components/regressions-toolbar";
import { RegressionsTable } from "@/app/(protected)/(dashboard)/projects/[projectId]/regressions/_components/regressions-table";
import { RegressionsEmpty } from "@/app/(protected)/(dashboard)/projects/[projectId]/regressions/_components/regressions-empty";
import { RegressionsPagination } from "@/app/(protected)/(dashboard)/projects/[projectId]/regressions/_components/regressions-pagination";

import type {
  ListRegressionsData,
  RegressionsMetricFilter,
  RegressionsSortField,
  SortDirection,
} from "@/app/server/domain/regressions/list/types";

const SEARCH_DEBOUNCE_MS = 300;

type RegressionsListProps = {
  projectId: string;
  data: ListRegressionsData;
  pageSize: number;
  appliedMetric: RegressionsMetricFilter;
};

export function RegressionsList({ projectId, data, pageSize, appliedMetric }: RegressionsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useQueryStates(regressionsListSearchParsers, QUERY_STATE_OPTIONS);

  const currentPage = Math.max(1, query.page);
  const debouncedSearch = useDebouncedValue(query.search, SEARCH_DEBOUNCE_MS);
  const previousSearchRef = useRef(debouncedSearch);

  const isMetricUpdating = appliedMetric !== query.metric;

  const totalRegressions = data.summary.totalRegressions;
  const totalPages = Math.max(1, Math.ceil(totalRegressions / pageSize));
  const rangeStart = data.items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = data.items.length === 0 ? 0 : Math.min(currentPage * pageSize, totalRegressions);

  const isFiltered = query.search.trim().length > 0 || query.metric !== "all";
  const hasAnyRegressions = data.summary.baseTotalRegressions > 0;

  const emptyState = useMemo(() => {
    if (data.items.length > 0) return null;
    if (isFiltered) {
      return { title: "No results", description: "Try adjusting your search or metric filter to see more results." };
    }
    if (!hasAnyRegressions) {
      return {
        title: "No regressions",
        description: "Great news! No performance regressions detected for this period.",
      };
    }
    if (currentPage > 1) {
      return { title: "No results", description: "Try going back to a previous page." };
    }
    return { title: "No regressions found", description: "No regressions match the selected time range." };
  }, [currentPage, data.items.length, hasAnyRegressions, isFiltered]);

  useEffect(() => {
    if (previousSearchRef.current === debouncedSearch) {
      return;
    }
    previousSearchRef.current = debouncedSearch;
    startTransition(() => {
      router.refresh();
    });
  }, [debouncedSearch, router, startTransition]);

  useEffect(() => {
    if (currentPage <= totalPages) return;
    startTransition(() => {
      void setQuery({ page: totalPages });
    });
  }, [currentPage, setQuery, startTransition, totalPages]);

  const handleSearchChange = (value: string) => {
    startTransition(() => {
      void setQuery({ search: value, page: 1 }, SEARCH_QUERY_OPTIONS);
    });
  };

  const handleMetricChange = (value: RegressionsMetricFilter) => {
    startTransition(() => {
      void setQuery({ metric: value, page: 1 });
    });
  };

  const handleSort = (field: RegressionsSortField) => {
    let nextDirection: SortDirection;
    if (query.sort === field) {
      nextDirection = query.direction === "asc" ? "desc" : "asc";
    } else if (field === "route" || field === "metric") {
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

  const handleRowClick = (route: string) => {
    startTransition(() => {
      router.push(`/projects/${projectId}/routes/${encodeURIComponent(route)}`);
    });
  };

  return (
    <div className="space-y-6">
      <RegressionsSummaryCards summary={data.summary} isPending={isMetricUpdating && isPending} />

      <RegressionsToolbar
        search={query.search}
        metric={query.metric}
        onSearchChange={handleSearchChange}
        onMetricChange={handleMetricChange}
      />

      <Card className="bg-card border-border gap-0 overflow-hidden p-0">
        <RegressionsTable
          items={data.items}
          sort={{ field: query.sort, direction: query.direction }}
          onSort={handleSort}
          onRowClick={handleRowClick}
          isPending={isMetricUpdating && isPending}
        />

        {emptyState && (
          <div className="border-border border-t">
            <RegressionsEmpty title={emptyState.title} description={emptyState.description} />
          </div>
        )}

        <RegressionsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalItems={totalRegressions}
          isPending={isPending}
          onPageChange={handlePageChange}
        />
      </Card>
    </div>
  );
}
