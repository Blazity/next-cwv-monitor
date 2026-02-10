"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ChartDataPoint, TimeSeriesChart, TimeSeriesOverlay } from "@/components/dashboard/time-series-chart";
import { MetricSelector } from "@/components/dashboard/metric-selector";
import { getValidIntervalsForCustomRange, type DailySeriesPoint, type DateRange, type IntervalKey } from "@/app/server/domain/dashboard/overview/types";
import type { MetricName } from "@/app/server/domain/dashboard/overview/types";
import { dashboardSearchParsers, QUERY_STATE_OPTIONS } from "@/lib/search-params";
import { useQueryStates } from "nuqs";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TrendChartByMetricProps = {
  data: DailySeriesPoint[];
  title?: string;
  description?: string;
  dateRange: DateRange;
  interval: IntervalKey;
  multiOverlay?: TimeSeriesOverlay[];
};

const intervalMutators: Record<IntervalKey, (d: Date) => void> = {
  month: (d) => d.setUTCMonth(d.getUTCMonth() + 1),
  week: (d) => d.setUTCDate(d.getUTCDate() + 7),
  day: (d) => d.setUTCDate(d.getUTCDate() + 1),
  hour: (d) => d.setUTCHours(d.getUTCHours() + 1),
};

export function TrendChartByMetric({
  data,
  title = "Trend Over Time",
  description,
  dateRange,
  interval,
  multiOverlay,
}: TrendChartByMetricProps) {
  const [isPending, startTransition] = useTransition();
  const [{ metric }, setQuery] = useQueryStates(
    dashboardSearchParsers, 
    {...QUERY_STATE_OPTIONS, startTransition}
  );

  const handleMetricChange = (newMetric: MetricName) => {
    void setQuery({ metric: newMetric });
  };

  const handleRangeSelect = (start: ChartDataPoint, end: ChartDataPoint) => {
    const startDate = new Date(start.timestamp);
    let endDate = new Date(end.timestamp);
    
    if (startDate.getTime() === endDate.getTime()) {
      const mutate = intervalMutators[interval];
      endDate = new Date(startDate);
      mutate(endDate);
    }
    const exclusiveEndDate = new Date(endDate.getTime() - 1);
    const validIntervals = getValidIntervalsForCustomRange(startDate, endDate);
    const nextInterval: IntervalKey = validIntervals[0] ?? "day";

    void setQuery({ 
      from: startDate,
      to: exclusiveEndDate,
      interval: nextInterval,
      timeRange: null
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex flex-row items-center gap-2 text-foreground text-lg font-medium">
              {title}
              {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <MetricSelector selected={metric} onChange={handleMetricChange} disabled={isPending} showOtherMetrics />
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className={cn(
            "transition-opacity duration-300 ease-in-out opacity-100",
            { "opacity-40 grayscale-[20%] pointer-events-none": isPending }
          )}
        >
          <TimeSeriesChart
            data={data}
            metric={metric}
            height={300}
            dateRange={dateRange}
            interval={interval}
            overlays={multiOverlay}
            onRangeSelect={isPending ? undefined : handleRangeSelect}
          />
        </div>
        <div className="text-muted-foreground mt-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="bg-status-good h-px w-8 opacity-50"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, var(--status-good) 0, var(--status-good) 4px, transparent 4px, transparent 8px)",
              }}
            />
            <span>Good threshold</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="bg-status-poor h-px w-8 opacity-50"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, var(--status-poor) 0, var(--status-poor) 4px, transparent 4px, transparent 8px)",
              }}
            />
            <span>Poor threshold</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
