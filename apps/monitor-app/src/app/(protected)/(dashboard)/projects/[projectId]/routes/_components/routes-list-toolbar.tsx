'use client';

import { ChevronDown, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { METRIC_NAMES, PERCENTILES } from '@/app/server/domain/routes/list/types';
import type { MetricName, Percentile } from '@/app/server/domain/routes/list/types';
import {
  METRIC_DETAILS,
  PERCENTILE_LABELS
} from '@/app/(protected)/(dashboard)/projects/[projectId]/routes/_components/routes-list-constants';

type RoutesListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  metric: MetricName;
  onMetricChange: (metric: MetricName) => void;
  percentile: Percentile;
  onPercentileChange: (percentile: Percentile) => void;
};

export function RoutesListToolbar({
  search,
  onSearchChange,
  metric,
  onMetricChange,
  percentile,
  onPercentileChange
}: RoutesListToolbarProps) {
  const percentileLabel = PERCENTILE_LABELS[percentile];

  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div className="relative w-full sm:w-80">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search routes..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="bg-card border-border pl-9"
          aria-label="Search routes"
        />
      </div>

      <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="border-border bg-card hover:bg-accent flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
            type="button"
            aria-label="Select metric"
          >
            <span className="text-foreground">{metric}</span>
            <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {METRIC_NAMES.map((metricOption) => (
              <DropdownMenuItem
                key={metricOption}
                onClick={() => onMetricChange(metricOption)}
                className={cn(metricOption === metric && 'bg-accent')}
              >
                <div className="flex flex-col">
                  <span className="text-foreground font-medium">{metricOption}</span>
                  <span className="text-muted-foreground text-xs">{METRIC_DETAILS[metricOption]}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="border-border bg-card hover:bg-accent flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
            type="button"
            aria-label="Select percentile"
          >
            <span className="text-foreground">{percentileLabel}</span>
            <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-24">
            {PERCENTILES.map((value) => (
              <DropdownMenuItem
                key={value}
                onClick={() => onPercentileChange(value)}
                className={cn(value === percentile && 'bg-accent')}
              >
                {PERCENTILE_LABELS[value]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
