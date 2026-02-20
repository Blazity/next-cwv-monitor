"use client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryStates } from "nuqs";
import { INTERVALS, TIME_RANGES, timeRangeToIntervals, isTimeRangeKey, getEffectiveInterval, type TimeRangeKey, type IntervalKey, getDefaultIntervalForRange, getValidIntervalsForCustomRange } from "@/app/server/domain/dashboard/overview/types";
import { dashboardSearchParamsCache, dashboardSearchParsers, QUERY_STATE_OPTIONS } from "@/lib/search-params";

const DEFAULT_TIME_RANGE: TimeRangeKey = "7d";

export function TimeRangeSelector() {
  const [{ timeRange, interval: intervalParam, from, to }, setQueryStates] = useQueryStates(
    dashboardSearchParsers, 
    { ...QUERY_STATE_OPTIONS }
  );

  const isZoomed = Boolean(from && to);
  const effectiveTimeRange = isTimeRangeKey(timeRange) ? timeRange : DEFAULT_TIME_RANGE;
  const validIntervals = isZoomed
    ? getValidIntervalsForCustomRange(from!, to!)
    : timeRangeToIntervals[effectiveTimeRange];
  const effectiveInterval = getEffectiveInterval(
    intervalParam, 
    effectiveTimeRange, 
    isZoomed ? { from, to } : undefined
  );

  const rangeLabel = isZoomed 
    ? "Custom Range" 
    : TIME_RANGES.find((r) => r.value === effectiveTimeRange)?.label;
  
  const handleTimeRangeChange = (value: TimeRangeKey) => {
    const updates: Partial<ReturnType<typeof dashboardSearchParamsCache.all>> = {
      timeRange: value,
      from: null,
      to: null 
    };
  
    const validOptionsForNewRange = timeRangeToIntervals[value] as IntervalKey[];
    
    if (!validOptionsForNewRange.includes(effectiveInterval)) {
      updates.interval = getDefaultIntervalForRange(value);
    }
  
    void setQueryStates(updates);
  };

  const handleIntervalChange = (value: IntervalKey) => {
    void setQueryStates({ interval: value });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(
        "border-border bg-card hover:bg-accent flex items-center gap-1 rounded-md border px-2 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-3 sm:text-sm",
        isZoomed && "border-primary/50 bg-primary/5"
      )}>
        <span className="text-foreground">
          {rangeLabel} / {INTERVALS.find((g) => g.value === effectiveInterval)?.label}
        </span>
        <ChevronDown className="text-muted-foreground h-3 w-3 sm:h-4 sm:w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {TIME_RANGES.map((range) => (
          <DropdownMenuItem
            key={range.value}
            onClick={() => handleTimeRangeChange(range.value)}
            className={cn("cursor-pointer", {"bg-accent": effectiveTimeRange === range.value && !isZoomed})}
          >
            {range.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Interval</DropdownMenuLabel>
        {INTERVALS.map((g) => {
              const isDisabled = !validIntervals.includes(g.value);
              return (
                <DropdownMenuItem
                  key={g.value}
                  onClick={() => handleIntervalChange(g.value)}
                  disabled={isDisabled}
                  className={cn(
                    "cursor-pointer",
                    effectiveInterval === g.value && "bg-accent",
                    isDisabled && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {g.label}
                </DropdownMenuItem>
              )
            })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
