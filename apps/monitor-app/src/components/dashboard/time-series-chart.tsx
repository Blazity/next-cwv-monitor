"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/badge";
import { statusToBadge } from "@/consts/status-to-badge";
import { getMetricThresholds, getRatingForValue } from "@/app/server/lib/cwv-thresholds";
import { formatMetricValue } from "@/lib/utils";
import type { DailySeriesPoint, MetricName, Percentile } from "@/app/server/domain/dashboard/overview/types";
import type { WebVitalRatingV1 } from "cwv-monitor-contracts";

export type TimeSeriesOverlayPoint = {
  date: string;
  views: number;
  conversions: number;
  conversionRatePct: number | null;
};

export type TimeSeriesOverlay = {
  label: string;
  series: TimeSeriesOverlayPoint[];
};

type TimeSeriesChartProps = {
  data: DailySeriesPoint[];
  metric: MetricName;
  percentile?: Percentile;
  overlay?: TimeSeriesOverlay | null;
  height?: number;
  dateRange: { start: Date; end: Date };
};

type ChartDataPoint = {
  timestamp: string;
  value: number | null;
  samples: number;
  status: WebVitalRatingV1 | null;
  time: string;
  overlayRatePct?: number | null;
  overlayViews?: number;
  overlayConversions?: number;
  hoverTarget?: number;
};

export function TimeSeriesChart({
  data,
  metric,
  percentile = "p75",
  overlay,
  height = 300,
  dateRange,
}: TimeSeriesChartProps) {
  const overlayByDate = useMemo(() => {
    if (!overlay) return null;
    const map = new Map<string, TimeSeriesOverlayPoint>();
    for (const point of overlay.series) {
      map.set(point.date, point);
    }
    return map;
  }, [overlay]);

  const chartData = useMemo(() => {
    const dataByDate = new Map(data.map((p) => [p.date, p]));
    const points: ChartDataPoint[] = [];

    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    for (let i = 0; i < diffDays; i++) {
      const currentTick = new Date(start);
      currentTick.setDate(start.getDate() + i);
      const isoDate = currentTick.toISOString().split("T")[0];

      const point = dataByDate.get(isoDate);
      const overlayPoint = overlayByDate?.get(isoDate);
      const value = point?.quantiles ? point.quantiles[percentile] : null;
      points.push({
        timestamp: isoDate,
        value,
        samples: point?.sampleSize ?? 0,
        status: typeof value === "number" ? getRatingForValue(metric, value) : null,
        time: currentTick.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        overlayRatePct: overlayPoint?.conversionRatePct ?? null,
        overlayViews: overlayPoint?.views ?? 0,
        overlayConversions: overlayPoint?.conversions ?? 0,
        // For null values, add a hover target so users can still trigger tooltip
        hoverTarget: value === null ? 0 : undefined,
      });
    }

    return points;
  }, [data, metric, overlayByDate, percentile, dateRange]);

  const thresholds = getMetricThresholds(metric);

  const maxValue = Math.max(
    ...data.map((d) => (d.quantiles ? d.quantiles[percentile] : null)).filter((v): v is number => v !== null),
    thresholds.needsImprovement * 1.1,
  );

  const overlayRates = overlay
    ? overlay.series.map((p) => p.conversionRatePct ?? null).filter((v): v is number => v !== null)
    : [];
  const maxOverlayRate = Math.max(1, ...overlayRates);
  const overlayDomainMax = Math.min(100, maxOverlayRate * 1.1);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="overlayGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-5)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--chart-5)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)" }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            yAxisId="metric"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)" }}
            tickFormatter={(value) => formatMetricValue(metric, value)}
            domain={[0, maxValue]}
            width={60}
          />
          {overlay && (
            <YAxis
              yAxisId="overlay"
              orientation="right"
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)" }}
              tickFormatter={(value) => `${Number(value).toFixed(1)}%`}
              domain={[0, overlayDomainMax]}
              width={50}
            />
          )}
          <ReferenceLine
            yAxisId="metric"
            y={thresholds.good}
            stroke="var(--status-good)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <ReferenceLine
            yAxisId="metric"
            y={thresholds.needsImprovement}
            stroke="var(--status-poor)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || payload.length === 0) return null;
              const point = payload[0]?.payload as ChartDataPoint | undefined;
              if (!point) return null;

              if (point.value === null) {
                return (
                  <div className="bg-popover border-border rounded-lg border p-3 shadow-lg">
                    <p className="text-muted-foreground text-sm">{point.time}</p>
                    <p className="text-muted-foreground mt-1 text-sm">No data</p>
                  </div>
                );
              }

              return (
                <div className="bg-popover border-border rounded-lg border p-3 shadow-lg">
                  <p className="text-muted-foreground mb-2 text-sm">{point.time}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-foreground text-sm">
                        {metric} ({percentile.toUpperCase()})
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-mono text-sm font-medium">
                          {formatMetricValue(metric, point.value)}
                        </span>
                        {point.status && <Badge {...statusToBadge[point.status]} label={undefined} size="sm" />}
                      </div>
                    </div>
                    <div className="text-muted-foreground text-xs">{point.samples.toLocaleString()} samples</div>
                    {overlay && typeof point.overlayRatePct === "number" && (
                      <div className="border-border mt-2 border-t pt-2">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-foreground text-sm">{overlay.label}</span>
                          <span className="text-foreground font-mono text-sm">{point.overlayRatePct.toFixed(2)}%</span>
                        </div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          {point.overlayConversions?.toLocaleString()} events / {point.overlayViews?.toLocaleString()}{" "}
                          tracked views
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          />
          <Area
            yAxisId="metric"
            type="monotone"
            dataKey="value"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#metricGradient)"
            connectNulls={false}
            dot={false}
            activeDot={{
              r: 4,
              fill: "var(--chart-1)",
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
          />
          {overlay && (
            <Area
              yAxisId="overlay"
              type="monotone"
              dataKey="overlayRatePct"
              stroke="var(--chart-5)"
              strokeWidth={2}
              fill="url(#overlayGradient)"
              connectNulls={false}
              dot={false}
              activeDot={{
                r: 4,
                fill: "var(--chart-5)",
                stroke: "var(--background)",
                strokeWidth: 2,
              }}
            />
          )}
          {/* Invisible scatter points for days with no data, enabling tooltip on hover */}
          <Scatter yAxisId="metric" dataKey="hoverTarget" fill="transparent" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
