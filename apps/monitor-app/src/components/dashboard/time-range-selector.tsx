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
import { parseAsString } from "nuqs";
import { INTERVALS, TIME_RANGES, timeRangeToIntervals, isTimeRangeKey, getDefaultInterval, isValidIntervalForTimeRange, getEffectiveInterval, type TimeRangeKey, type IntervalKey } from "@/app/server/domain/dashboard/overview/types";

const DEFAULT_TIME_RANGE: TimeRangeKey = "7d";

export function TimeRangeSelector() {
  const [{ timeRange, interval: intervalParam }, setQueryStates] = useQueryStates(
    {
      timeRange: parseAsString.withDefault(DEFAULT_TIME_RANGE),
      interval: parseAsString,
    },
    { shallow: false }
  );

  const effectiveTimeRange = isTimeRangeKey(timeRange) ? timeRange : DEFAULT_TIME_RANGE;
  const effectiveInterval = getEffectiveInterval(intervalParam, effectiveTimeRange);

  const handleTimeRangeChange = (value: TimeRangeKey) => {
    const updates: { timeRange: TimeRangeKey; interval?: string } = { timeRange: value };
    if (!isValidIntervalForTimeRange(effectiveInterval, value)) {
      updates.interval = getDefaultInterval(value);
    }
    void setQueryStates(updates);
  };

  const handleIntervalChange = (value: string) => {
    void setQueryStates({ interval: value });
  };

  const validIntervalsForTimeRange: readonly IntervalKey[] = timeRangeToIntervals[effectiveTimeRange];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="border-border bg-card hover:bg-accent flex items-center gap-1 rounded-md border px-2 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-3 sm:text-sm">
        <span className="text-foreground sm:hidden">{effectiveTimeRange} / {effectiveInterval}</span>
        <span className="text-foreground hidden sm:inline">
          {TIME_RANGES.find((r) => r.value === effectiveTimeRange)?.label} / {INTERVALS.find((g) => g.value === effectiveInterval)?.label}
        </span>
        <ChevronDown className="text-muted-foreground h-3 w-3 sm:h-4 sm:w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {TIME_RANGES.map((range) => (
          <DropdownMenuItem
            key={range.value}
            onClick={() => handleTimeRangeChange(range.value)}
            className={cn("cursor-pointer", effectiveTimeRange === range.value && "bg-accent")}
          >
            {range.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Interval</DropdownMenuLabel>
        {INTERVALS.map((g) => {
              const isDisabled = !validIntervalsForTimeRange.includes(g.value)
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
