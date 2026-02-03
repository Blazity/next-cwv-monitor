"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { TimeSeriesChart, TimeSeriesOverlay } from "@/components/dashboard/time-series-chart";
import { MetricSelector } from "@/components/dashboard/metric-selector";
import type { DailySeriesPoint, DateRange, IntervalKey } from "@/app/server/domain/dashboard/overview/types";
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

  const activeMetric = metric;

  const handleMetricChange = (newMetric: MetricName) => {
    void setQuery({ metric: newMetric });
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
          <MetricSelector selected={activeMetric} onChange={handleMetricChange} disabled={isPending} showOtherMetrics />
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className={cn(
            "transition-opacity duration-300 ease-in-out",
            isPending ? "opacity-40 grayscale-[20%] pointer-events-none" : "opacity-100"
          )}
        >
          <TimeSeriesChart
            data={data}
            metric={activeMetric}
            height={300}
            dateRange={dateRange}
            interval={interval}
            overlays={multiOverlay}
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
