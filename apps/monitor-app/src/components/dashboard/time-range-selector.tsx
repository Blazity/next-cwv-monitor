"use client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryState } from "nuqs";
import { parseAsString } from "nuqs";
import { TIME_RANGES } from "@/app/server/domain/dashboard/overview/types";

const DEFAULT_TIME_RANGE = "7d";

export function TimeRangeSelector() {
  const [timeRange, setTimeRange] = useQueryState(
    "timeRange",
    parseAsString.withDefault(DEFAULT_TIME_RANGE).withOptions({ shallow: false }),
  );
  const handleTimeRangeChange = (value: string) => {
    void setTimeRange(value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="border-border bg-card hover:bg-accent flex items-center gap-1 rounded-md border px-2 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-3 sm:text-sm">
        <span className="text-foreground sm:hidden">{timeRange}</span>
        <span className="text-foreground hidden sm:inline">
          {TIME_RANGES.find((r) => r.value === timeRange)?.label}
        </span>
        <ChevronDown className="text-muted-foreground h-3 w-3 sm:h-4 sm:w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {TIME_RANGES.map((range) => (
          <DropdownMenuItem
            key={range.value}
            onClick={() => handleTimeRangeChange(range.value)}
            className={cn("cursor-pointer", timeRange === range.value && "bg-accent")}
          >
            {range.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
