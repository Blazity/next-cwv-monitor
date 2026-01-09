"use client";

import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, Route } from "lucide-react";

import { formatCompactNumber, formatMetricValue } from "@/lib/utils";

import type {
  RegressionListItem,
  RegressionsSortField,
  SortDirection,
} from "@/app/server/domain/regressions/list/types";
import { getRatingForValue } from "@/app/server/lib/cwv-thresholds";
import { statusToBadge } from "@/consts/status-to-badge";
import { Badge } from "@/components/badge";

type RegressionsTableProps = {
  items: RegressionListItem[];
  sort: { field: RegressionsSortField; direction: SortDirection };
  onSort: (field: RegressionsSortField) => void;
  onRowClick: (route: string) => void;
  isPending?: boolean;
};

export function RegressionsTable({ items, sort, onSort, onRowClick, isPending = false }: RegressionsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-border border-b">
            <th className="px-4 text-left" aria-sort={sort.field === "route" ? toAriaSort(sort.direction) : "none"}>
              <button
                type="button"
                onClick={() => onSort("route")}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 py-3 text-xs font-medium transition-colors"
              >
                Route
                <SortIcon active={sort.field === "route"} direction={sort.direction} />
              </button>
            </th>

            <th className="px-4 text-left" aria-sort={sort.field === "metric" ? toAriaSort(sort.direction) : "none"}>
              <button
                type="button"
                onClick={() => onSort("metric")}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 py-3 text-xs font-medium transition-colors"
              >
                Metric
                <SortIcon active={sort.field === "metric"} direction={sort.direction} />
              </button>
            </th>

            <th className="px-4 text-right">
              <span className="text-muted-foreground inline-block py-3 text-xs font-medium">Previous</span>
            </th>
            <th className="px-4 text-right">
              <span className="text-muted-foreground inline-block py-3 text-xs font-medium">Current</span>
            </th>

            <th className="px-4 text-right" aria-sort={sort.field === "change" ? toAriaSort(sort.direction) : "none"}>
              <button
                type="button"
                onClick={() => onSort("change")}
                className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-2 py-3 text-xs font-medium transition-colors"
              >
                Change
                <SortIcon active={sort.field === "change"} direction={sort.direction} />
              </button>
            </th>

            <th className="px-4 text-right" aria-sort={sort.field === "views" ? toAriaSort(sort.direction) : "none"}>
              <button
                type="button"
                onClick={() => onSort("views")}
                className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-2 py-3 text-xs font-medium transition-colors"
              >
                Tracked views
                <SortIcon active={sort.field === "views"} direction={sort.direction} />
              </button>
            </th>

            <th className="w-12 px-4" />
          </tr>
        </thead>

        <tbody>
          {items.map((item) => {
            const percent = item.previousValue > 0 ? (item.change / item.previousValue) * 100 : null;
            const rating = getRatingForValue(item.metricName, item.currentValue);
            const isCritical = rating === "poor";

            return (
              <tr
                key={`${item.route}-${item.metricName}`}
                onClick={() => onRowClick(item.route)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onRowClick(item.route);
                  }
                }}
                role="link"
                tabIndex={0}
                className="border-border hover:bg-accent/30 group cursor-pointer border-b transition-colors last:border-0"
              >
                <td className="p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Route className="text-muted-foreground h-4 w-4 shrink-0" />
                    <span className="text-foreground truncate font-mono text-sm">{item.route}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-foreground text-sm font-medium">{item.metricName}</span>
                </td>
                <td className="p-4 text-right">
                  <span className="text-muted-foreground font-mono text-sm">
                    {formatMetricValue(item.metricName, item.previousValue)}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-foreground font-mono text-sm">
                      {formatMetricValue(item.metricName, item.currentValue)}
                    </span>
                    <Badge {...statusToBadge[rating]} iconOnly size="sm" />
                  </div>
                </td>
                <td className="p-4 text-right">
                  {isPending ? (
                    <div className="bg-muted/60 ml-auto h-3 w-16 animate-pulse rounded" />
                  ) : (
                    <span
                      className={`font-mono text-sm font-medium ${
                        isCritical ? "text-status-poor" : "text-status-needs-improvement"
                      }`}
                    >
                      {percent === null ? "--" : `+${percent.toFixed(1)}%`}
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  {isPending ? (
                    <div className="bg-muted/60 ml-auto h-3 w-16 animate-pulse rounded" />
                  ) : (
                    <span className="text-muted-foreground text-sm">{formatCompactNumber(item.views)}</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="text-muted-foreground flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) {
    return <ArrowUpDown className="text-muted-foreground/50 h-4 w-4" />;
  }

  return direction === "asc" ? (
    <ArrowUp className="text-foreground h-4 w-4" />
  ) : (
    <ArrowDown className="text-foreground h-4 w-4" />
  );
}

function toAriaSort(direction: SortDirection): "ascending" | "descending" {
  return direction === "asc" ? "ascending" : "descending";
}
