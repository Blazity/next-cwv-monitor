'use client';

import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, Route } from 'lucide-react';

import { Badge } from '@/components/badge';
import { statusToBadge } from '@/consts/status-to-badge';
import { formatCompactNumber, formatMetricValue } from '@/lib/utils';
import type {
  MetricName,
  RouteListItem,
  RoutesSortField,
  SortDirection
} from '@/app/server/domain/routes/list/types';

type RoutesListTableProps = {
  items: RouteListItem[];
  metric: MetricName;
  percentileLabel: string;
  sort: { field: RoutesSortField; direction: SortDirection };
  onSort: (field: RoutesSortField) => void;
  onRowClick: (route: string) => void;
};

export function RoutesListTable({
  items,
  metric,
  percentileLabel,
  sort,
  onSort,
  onRowClick
}: RoutesListTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-border border-b">
            <th className="px-4 text-left" aria-sort={sort.field === 'route' ? toAriaSort(sort.direction) : 'none'}>
              <button
                type="button"
                onClick={() => onSort('route')}
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 py-3 text-xs font-medium transition-colors"
              >
                Route Pattern
                <SortIcon active={sort.field === 'route'} direction={sort.direction} />
              </button>
            </th>
            <th className="px-4 text-right" aria-sort={sort.field === 'views' ? toAriaSort(sort.direction) : 'none'}>
              <button
                type="button"
                onClick={() => onSort('views')}
                className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-2 py-3 text-xs font-medium transition-colors"
              >
                Views
                <SortIcon active={sort.field === 'views'} direction={sort.direction} />
              </button>
            </th>
            <th className="px-4 text-right" aria-sort={sort.field === 'metric' ? toAriaSort(sort.direction) : 'none'}>
              <button
                type="button"
                onClick={() => onSort('metric')}
                className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-2 py-3 text-xs font-medium transition-colors"
              >
                {metric} {percentileLabel}
                <SortIcon active={sort.field === 'metric'} direction={sort.direction} />
              </button>
            </th>
            <th className="px-4 text-center">
              <span className="text-muted-foreground inline-block py-3 text-xs font-medium">Status</span>
            </th>
            <th className="w-12 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((route) => (
            <tr
              key={route.route}
              onClick={() => onRowClick(route.route)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onRowClick(route.route);
                }
              }}
              role="link"
              tabIndex={0}
              className="border-border hover:bg-accent/30 group cursor-pointer border-b transition-colors last:border-0"
            >
              <td className="p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Route className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span className="text-foreground truncate font-mono text-sm">{route.route}</span>
                </div>
              </td>
              <td className="p-4 text-right">
                <span className="text-muted-foreground text-sm">{formatCompactNumber(route.views)}</span>
              </td>
              <td className="p-4 text-right">
                {route.metricValue === null ? (
                  <span className="text-muted-foreground text-sm">--</span>
                ) : (
                  <span className="text-foreground font-mono text-sm">{formatMetricValue(metric, route.metricValue)}</span>
                )}
              </td>
              <td className="p-4">
                <div className="flex justify-center">
                  {route.status ? (
                    <Badge {...statusToBadge[route.status]} size="sm" />
                  ) : (
                    <span className="text-muted-foreground text-xs">No data</span>
                  )}
                </div>
              </td>
              <td className="p-4">
                <div className="text-muted-foreground flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) {
    return <ArrowUpDown className="text-muted-foreground/50 h-4 w-4" />;
  }

  return direction === 'asc' ? (
    <ArrowUp className="text-foreground h-4 w-4" />
  ) : (
    <ArrowDown className="text-foreground h-4 w-4" />
  );
}

function toAriaSort(direction: SortDirection): 'ascending' | 'descending' {
  return direction === 'asc' ? 'ascending' : 'descending';
}
