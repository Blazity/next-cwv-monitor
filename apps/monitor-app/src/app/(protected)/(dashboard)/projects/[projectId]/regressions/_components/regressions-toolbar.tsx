"use client";

import { ChevronDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { METRIC_DETAILS } from "@/consts/metric-details";
import type { RegressionsMetricFilter } from "@/app/server/domain/regressions/list/types";

const REGRESSION_METRIC_OPTIONS: RegressionsMetricFilter[] = ["all", "LCP", "INP", "CLS", "TTFB"];

type RegressionsToolbarProps = {
  search: string;
  metric: RegressionsMetricFilter;
  onSearchChange: (value: string) => void;
  onMetricChange: (metric: RegressionsMetricFilter) => void;
};

export function RegressionsToolbar({ search, metric, onSearchChange, onMetricChange }: RegressionsToolbarProps) {
  const metricLabel = metric === "all" ? "All" : metric;

  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div className="relative w-full sm:w-80">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search routes..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="bg-card border-border pl-9"
          aria-label="Search regressions by route"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="border-border bg-card hover:bg-accent flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
          type="button"
          aria-label="Select metric filter"
        >
          <span className="text-foreground">{metricLabel}</span>
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {REGRESSION_METRIC_OPTIONS.map((metricOption) => (
            <DropdownMenuItem
              key={metricOption}
              onClick={() => onMetricChange(metricOption)}
              className={cn(metricOption === metric && "bg-accent")}
            >
              <div className="flex flex-col">
                <span className="text-foreground font-medium">
                  {metricOption === "all" ? "All metrics" : metricOption}
                </span>
                <span className="text-muted-foreground text-xs">
                  {metricOption === "all" ? "Show regressions across all metrics" : METRIC_DETAILS[metricOption]}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
