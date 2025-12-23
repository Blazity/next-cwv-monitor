"use client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryParam } from "@/lib/use-query-params";
import { TIME_RANGES } from "@/app/server/domain/dashboard/overview/types";

export function TimeRangeSelector() {
  const [timeRange, setTimeRange] = useQueryParam("timeRange", TIME_RANGES[0].value);
  const currentRange = TIME_RANGES.find((r) => r.value === timeRange) ?? TIME_RANGES[0];

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="border-border bg-card hover:bg-accent flex items-center gap-1 rounded-md border px-2 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-3 sm:text-sm">
        <span className="text-foreground sm:hidden">{currentRange.value}</span>
        <span className="text-foreground hidden sm:inline">{currentRange.label}</span>
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
