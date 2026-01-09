"use client";
import { fetchConversionTrend } from "@/app/server/lib/clickhouse/repositories/custom-events-repository";
import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Area,
} from "recharts";

type Props = {
  chartData: Awaited<ReturnType<typeof fetchConversionTrend>>;
};

type ChartPoint = {
  date: string;
  rate: number | null;
  events: number;
  views: number;
  hoverTarget?: number;
};

export function AnalyticsChart({ chartData }: Props) {
  const memoizedChartData = useMemo(
    () =>
      chartData.map(
        (point): ChartPoint => ({
          date: new Date(point.day).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          rate: point.conversion_rate,
          events: Number(point.events),
          views: Number(point.views),
          // For null values, add a hover target so users can still trigger tooltip
          hoverTarget: point.conversion_rate === null ? 0 : undefined,
        }),
      ),
    [chartData],
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={memoizedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="conversionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)" }}
          interval="preserveStartEnd"
          minTickGap={50}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)" }}
          tickFormatter={(v) => `${v.toFixed(1)}%`}
          width={50}
        />
        <RechartsTooltip
          content={({ active, payload }) => {
            if (!active || payload.length === 0) return null;
            const point = payload[0].payload as ChartPoint;

            if (point.rate === null) {
              return (
                <div className="bg-popover border-border rounded-lg border p-3 shadow-lg">
                  <p className="text-muted-foreground text-sm">{point.date}</p>
                  <p className="text-muted-foreground mt-1 text-sm">No data</p>
                </div>
              );
            }

            return (
              <div className="bg-popover border-border rounded-lg border p-3 shadow-lg">
                <p className="text-muted-foreground mb-2 text-sm">{point.date}</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-foreground text-sm">Conversion Rate</span>
                    <span className="text-foreground font-mono text-sm font-medium">{point.rate.toFixed(2)}%</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {point.events.toLocaleString()} events / {point.views.toLocaleString()} views
                  </div>
                </div>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="rate"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#conversionGradient)"
          dot={false}
          activeDot={{
            r: 4,
            fill: "var(--chart-1)",
            stroke: "var(--background)",
            strokeWidth: 2,
          }}
        />
        {/* Invisible scatter points for days with no data, enabling tooltip on hover */}
        <Scatter dataKey="hoverTarget" fill="transparent" isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
