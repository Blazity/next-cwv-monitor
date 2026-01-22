"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { TimeSeriesChart, TimeSeriesOverlay } from "@/components/dashboard/time-series-chart";
import { MetricSelector } from "@/components/dashboard/metric-selector";
import type { DailySeriesPoint, DateRange, IntervalKey } from "@/app/server/domain/dashboard/overview/types";
import type { MetricName } from "@/app/server/domain/dashboard/overview/types";

type TrendChartByMetricProps = {
  data: DailySeriesPoint[];
  metric: MetricName;
  title?: string;
  description?: string;
  dateRange: DateRange;
  interval: IntervalKey;
  multiOverlay?: TimeSeriesOverlay[];
  onMetricChange?: (metric: MetricName) => void;
};

export function TrendChartByMetric({
  data,
  metric,
  title = "Trend Over Time",
  description,
  dateRange,
  interval,
  multiOverlay,
  onMetricChange,
}: TrendChartByMetricProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricName>(metric);

  const handleMetricChange = (metric: MetricName) => {
    setSelectedMetric(metric);
    onMetricChange?.(metric);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-foreground text-lg font-medium">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <MetricSelector selected={selectedMetric} onChange={handleMetricChange} showOtherMetrics />
        </div>
      </CardHeader>
      <CardContent>
        <TimeSeriesChart
          data={data}
          metric={selectedMetric}
          height={300}
          dateRange={dateRange}
          interval={interval}
          overlays={multiOverlay}
        />
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
