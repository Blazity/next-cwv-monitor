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
import { useQueryState } from "nuqs";
import { parseAsString } from "nuqs";
import { GRANULARITIES, TIME_RANGES, timeRangeToGranularities, isTimeRangeKey, getDefaultGranularity, isValidGranularityForTimeRange, getEffectiveGranularity, type TimeRangeKey, type GranularityKey } from "@/app/server/domain/dashboard/overview/types";

const DEFAULT_TIME_RANGE: TimeRangeKey = "7d";

export function TimeRangeSelector() {
  const [timeRange, setTimeRange] = useQueryState(
    "timeRange",
    parseAsString.withDefault(DEFAULT_TIME_RANGE).withOptions({ shallow: false }),
  );
  const [granularityParam, setGranularity] = useQueryState(
    "granularity",
    parseAsString.withOptions({ shallow: false }),
  );

  const effectiveTimeRange = isTimeRangeKey(timeRange) ? timeRange : DEFAULT_TIME_RANGE;
  const effectiveGranularity = getEffectiveGranularity(granularityParam, effectiveTimeRange);

  const handleTimeRangeChange = (value: TimeRangeKey) => {
    void setTimeRange(value);
    if (!isValidGranularityForTimeRange(effectiveGranularity, value)) {
      void setGranularity(getDefaultGranularity(value));
    }
  };

  const handleGranularityChange = (value: string) => {
    void setGranularity(value);
  };

  const validGranularitiesForTimeRange = timeRangeToGranularities[effectiveTimeRange];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="border-border bg-card hover:bg-accent flex items-center gap-1 rounded-md border px-2 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-3 sm:text-sm">
        <span className="text-foreground sm:hidden">{effectiveTimeRange} / {effectiveGranularity}</span>
        <span className="text-foreground hidden sm:inline">
          {TIME_RANGES.find((r) => r.value === effectiveTimeRange)?.label} / {GRANULARITIES.find((g) => g.value === effectiveGranularity)?.label}
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
            {GRANULARITIES.map((g) => {
              const isDisabled = !validGranularitiesForTimeRange.some((opt) => opt === g.value)
              return (
                <DropdownMenuItem
                  key={g.value}
                  onClick={() => handleGranularityChange(g.value)}
                  disabled={isDisabled}
                  className={cn(
                    "cursor-pointer",
                    effectiveGranularity === g.value && "bg-accent",
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
