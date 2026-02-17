"use client";
import { fetchConversionTrend } from "@/app/server/lib/clickhouse/repositories/custom-events-repository";
import { Badge } from "@/components/badge";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  chartData: Awaited<ReturnType<typeof fetchConversionTrend>>;
};

type ChartPoint = {
  dayKey: string;
  date: string;
  rate: number | null;
  completeRate?: number | null;
  partialRate?: number | null;
  isPartialData?: boolean;
  events: number;
  views: number;
  hoverTarget?: number;
};

const utcDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" });

export function AnalyticsChart({ chartData }: Props) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  const memoizedChartData = useMemo(
    () =>
      chartData.map(
        (point): ChartPoint => ({
          dayKey: utcDateFormatter.format(new Date(point.day)),
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

  const currentPeriodIndex = useMemo(() => {
    const todayKey = utcDateFormatter.format(new Date());
    return memoizedChartData.findIndex((p) => p.dayKey === todayKey);
  }, [memoizedChartData]);

  const chartDataWithPartialSegment = useMemo(() => {
    if (currentPeriodIndex < 0) {
      return memoizedChartData.map((point) => ({
        ...point,
        completeRate: point.rate,
        partialRate: null,
        isPartialData: false,
      }));
    }

    let anchorRate: number | null = null;
    for (let index = currentPeriodIndex - 1; index >= 0; index--) {
      const candidateRate = memoizedChartData[index]?.rate;
      if (typeof candidateRate === "number") {
        anchorRate = candidateRate;
        break;
      }
    }

    const hasPartialRates =
      memoizedChartData.slice(currentPeriodIndex).some((point) => typeof point.rate === "number") || anchorRate !== null;

    let carryForwardPartialRate = anchorRate;

    return memoizedChartData.map((point, index) => {
      const isPartialData = index >= currentPeriodIndex;
      const isPartialAnchorPoint = index === currentPeriodIndex - 1;
      const hasRateValue = typeof point.rate === "number";
      const shouldRenderPartialPoint = isPartialData || isPartialAnchorPoint;

      let partialRate: number | null = null;
      if (hasPartialRates && shouldRenderPartialPoint) {
        if (hasRateValue) {
          partialRate = point.rate;
          carryForwardPartialRate = point.rate;
        } else if (carryForwardPartialRate !== null) {
          partialRate = carryForwardPartialRate;
        }
      }

      return {
        ...point,
        completeRate: index < currentPeriodIndex ? point.rate : null,
        partialRate,
        isPartialData,
      };
    });
  }, [memoizedChartData, currentPeriodIndex]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartDataWithPartialSegment} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="conversionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="partialConversionGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.18} />
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
          hide={isMobile}
        />
        <RechartsTooltip
          content={({ active, payload }) => {
            if (!active || payload.length === 0) return null;
            const point = payload[0].payload as ChartPoint;
            const isPartial = Boolean(point.isPartialData);

            if (point.rate === null) {
              return (
                <div className="bg-popover border-border rounded-lg border p-3 shadow-lg">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-muted-foreground text-sm">{point.date}</p>
                    {isPartial && <Badge type="warning" size="sm" label="Partial" />}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">No data</p>
                </div>
              );
            }

            return (
              <div className="bg-popover border-border rounded-lg border p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-muted-foreground text-sm">{point.date}</p>
                  {isPartial && <Badge type="warning" size="sm" label="Partial" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-foreground text-sm">Conversion Rate</span>
                    <span className="text-foreground font-mono text-sm font-medium">{point.rate.toFixed(2)}%</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {point.events.toLocaleString()} events / {point.views.toLocaleString()} views{" "}
                    {isPartial && <span className="italic">(Still collecting)</span>}
                  </div>
                </div>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="completeRate"
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

        <Area
          type="monotone"
          dataKey="partialRate"
          stroke="none"
          fill="url(#partialConversionGradient)"
          connectNulls={false}
          dot={false}
          activeDot={false}
        />

        <Line
          type="monotone"
          dataKey="partialRate"
          stroke="var(--chart-1)"
          strokeWidth={2}
          strokeDasharray="6 4"
          connectNulls={false}
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
