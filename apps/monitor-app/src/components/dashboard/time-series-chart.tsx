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
import { format, addDays, addHours } from "date-fns";

import { Badge } from "@/components/badge";
import { toISODateUTC, toUTCTimestamp, getStartOfWeekUTC, getUTCYearMonth, toHourKeyUTC } from "@/lib/utc-date";
import { statusToBadge } from "@/consts/status-to-badge";
import { getMetricThresholds, getRatingForValue } from "@/app/server/lib/cwv-thresholds";
import { formatMetricValue } from "@/lib/utils";
import type {
  DailySeriesPoint,
  IntervalKey,
  MetricName,
  Percentile,
} from "@/app/server/domain/dashboard/overview/types";
import type { WebVitalRatingV1 } from "cwv-monitor-contracts";
import { useMediaQuery } from "@/hooks/use-media-query";

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
  interval: IntervalKey;
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

type CreateChartPointParams = {
  timestamp: string;
  timeLabel: string;
  dataByDate: Map<string, DailySeriesPoint>;
  overlayByDate: Map<string, TimeSeriesOverlayPoint> | null;
  percentile: Percentile;
  metric: MetricName;
};

const createChartDataPoint = ({
  timestamp,
  timeLabel,
  dataByDate,
  overlayByDate,
  percentile,
  metric,
}: CreateChartPointParams): ChartDataPoint => {
  const point = dataByDate.get(timestamp);
  const overlayPoint = overlayByDate?.get(timestamp);
  const value = point?.quantiles?.[percentile] ?? null;

  return {
    timestamp,
    value,
    samples: point?.sampleSize ?? 0,
    status: typeof value === "number" ? getRatingForValue(metric, value) : null,
    time: timeLabel,
    overlayRatePct: overlayPoint?.conversionRatePct ?? null,
    overlayViews: overlayPoint?.views ?? 0,
    overlayConversions: overlayPoint?.conversions ?? 0,
    hoverTarget: value === null ? 0 : undefined,
  };
};

type GeneratorContext = {
  start: Date;
  end: Date;
  dataByDate: Map<string, DailySeriesPoint>;
  overlayByDate: Map<string, TimeSeriesOverlayPoint> | null;
  percentile: Percentile;
  metric: MetricName;
};

const generateHourlyPoints = (ctx: GeneratorContext): ChartDataPoint[] => {
  const { start, end, ...pointParams } = ctx;
  const points: ChartDataPoint[] = [];

  let currentHour = start;
  while (currentHour <= end) {
    const nextHour = addHours(currentHour, 1);
    const hourKey = toHourKeyUTC(currentHour);
    const dateLabel = format(currentHour, "MMM d");
    const timeLabel = `${dateLabel}, ${format(currentHour, "h a")} - ${format(nextHour, "h a")}`;

    points.push(createChartDataPoint({ timestamp: hourKey, timeLabel, ...pointParams }));

    currentHour = nextHour;
  }

  return points;
};

const generateDailyPoints = (ctx: GeneratorContext): ChartDataPoint[] => {
  const { start, end, ...pointParams } = ctx;
  const points: ChartDataPoint[] = [];

  let currentDay = start;
  while (currentDay <= end) {
    const isoDate = toISODateUTC(currentDay);
    const timeLabel = format(currentDay, "MMM d");

    points.push(createChartDataPoint({ timestamp: isoDate, timeLabel, ...pointParams }));

    currentDay = addDays(currentDay, 1);
  }

  return points;
};

const generateWeeklyPoints = (ctx: GeneratorContext): ChartDataPoint[] => {
  const { start, end, ...pointParams } = ctx;
  const points: ChartDataPoint[] = [];

  const startUTC = toUTCTimestamp(start);
  const endUTC = toUTCTimestamp(end);
  const msPerDay = 24 * 60 * 60 * 1000;
  const msPerWeek = 7 * msPerDay;
  let currentTick = getStartOfWeekUTC(startUTC);

  while (currentTick <= endUTC) {
    const weekStart = new Date(currentTick);
    const weekEnd = addDays(weekStart, 6);
    const weekKey = toISODateUTC(weekStart);
    const timeLabel = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`;

    points.push(createChartDataPoint({ timestamp: weekKey, timeLabel, ...pointParams }));

    currentTick += msPerWeek;
  }

  return points;
};

const generateMonthlyPoints = (ctx: GeneratorContext): ChartDataPoint[] => {
  const { start, end, ...pointParams } = ctx;
  const points: ChartDataPoint[] = [];

  const { year: startYear, month: startMonth } = getUTCYearMonth(start);
  const { year: endYear, month: endMonth } = getUTCYearMonth(end);

  let currentYear = startYear;
  let currentMonth = startMonth;

  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    const monthStart = new Date(Date.UTC(currentYear, currentMonth, 1));
    const monthKey = toISODateUTC(monthStart);
    const timeLabel = format(monthStart, "MMM yyyy");

    points.push(createChartDataPoint({ timestamp: monthKey, timeLabel, ...pointParams }));

    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
  }

  return points;
};

const INTERVAL_GENERATORS: Record<IntervalKey, (ctx: GeneratorContext) => ChartDataPoint[]> = {
  hour: generateHourlyPoints,
  day: generateDailyPoints,
  week: generateWeeklyPoints,
  month: generateMonthlyPoints,
};

/**
 * Returns the timestamp key for the current (incomplete) period based on the interval.
 * Used to identify chart data points that represent partial/incomplete data.
 */
const CURRENT_PERIOD_KEY_GETTERS: Record<IntervalKey, () => string> = {
  hour: () => toHourKeyUTC(new Date()),
  day: () => toISODateUTC(new Date()),
  week: () => {
    const weekStart = getStartOfWeekUTC(toUTCTimestamp(new Date()));
    return toISODateUTC(new Date(weekStart));
  },
  month: () => {
    const { year, month } = getUTCYearMonth(new Date());
    return toISODateUTC(new Date(Date.UTC(year, month, 1)));
  },
};

type ChartTooltipProps = {
  point: ChartDataPoint;
  metric: MetricName;
  percentile: Percentile;
  overlay?: TimeSeriesOverlay | null;
  isPartialData?: boolean;
};

const ChartTooltipContent = ({ point, metric, percentile, overlay, isPartialData }: ChartTooltipProps) => {
  if (point.value === null) {
    return (
      <div className="bg-popover border-border rounded-lg border p-3 shadow-lg">
        <p className="text-muted-foreground text-sm">{point.time}</p>
        <p className="text-muted-foreground mt-1 text-sm">No data</p>
        {isPartialData && (
          <p className="text-muted-foreground mt-1 text-xs italic">Partial data – period still in progress</p>
        )}
      </div>
    );
  }

  const hasOverlayData = overlay && typeof point.overlayRatePct === "number";

  return (
    <div className="bg-popover border-border rounded-lg border p-3 shadow-lg">
      <p className="text-muted-foreground mb-2 text-sm">{point.time}</p>
      <div className="space-y-2">
        {/* Metric Value Row */}
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

        {/* Sample Count */}
        <div className="text-muted-foreground text-xs">{point.samples.toLocaleString()} samples</div>

        {/* Partial data notice */}
        {isPartialData && (
          <div className="text-muted-foreground text-xs italic">Partial data – period still in progress</div>
        )}

        {/* Overlay Data */}
        {hasOverlayData && (
          <div className="border-border mt-2 border-t pt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-foreground text-sm">{overlay.label}</span>
              <span className="text-foreground font-mono text-sm">{point.overlayRatePct?.toFixed(2)}%</span>
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              {point.overlayConversions?.toLocaleString()} events / {point.overlayViews?.toLocaleString()} tracked views
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CHART_MARGINS = { top: 10, right: 10, left: 0, bottom: 0 };

const AXIS_STYLES = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--muted-foreground)" },
} as const;

const ACTIVE_DOT_CONFIG = (color: string) => ({
  r: 4,
  fill: color,
  stroke: "var(--background)",
  strokeWidth: 2,
});

const ChartGradients = () => (
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
);

export function TimeSeriesChart({
  data,
  metric,
  percentile = "p75",
  overlay,
  height = 300,
  dateRange,
  interval,
}: TimeSeriesChartProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Build overlay lookup map
  const overlayByDate = useMemo(() => {
    if (!overlay) return null;
    return new Map(overlay.series.map((point) => [point.date, point]));
  }, [overlay]);

  // Generate chart data points based on interval
  const chartData = useMemo(() => {
    const dataByDate = new Map(data.map((p) => [p.date, p]));
    const generator = INTERVAL_GENERATORS[interval];

    return generator({
      start: new Date(dateRange.start),
      end: new Date(dateRange.end),
      dataByDate,
      overlayByDate,
      percentile,
      metric,
    });
  }, [data, metric, overlayByDate, percentile, dateRange, interval]);

  // Calculate Y-axis domains
  const thresholds = getMetricThresholds(metric);

  const maxMetricValue = useMemo(() => {
    const values = data.map((d) => d.quantiles?.[percentile] ?? null).filter((v): v is number => v !== null);
    return Math.max(...values, thresholds.needsImprovement * 1.1);
  }, [data, percentile, thresholds.needsImprovement]);

  const overlayDomainMax = useMemo(() => {
    if (!overlay) return 0;
    const rates = overlay.series.map((p) => p.conversionRatePct).filter((v): v is number => v !== null);
    const maxRate = Math.max(1, ...rates);
    return Math.min(100, maxRate * 1.1);
  }, [overlay]);

  // Find the incomplete (partial) data point for the current period
  const incompletePointLabel = useMemo(() => {
    const currentKey = CURRENT_PERIOD_KEY_GETTERS[interval]();
    const point = chartData.find((p) => p.timestamp === currentKey);
    return point?.time ?? null;
  }, [chartData, interval]);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={CHART_MARGINS}>
          <ChartGradients />

          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />

          {/* X-Axis */}
          <XAxis
            dataKey="time"
            {...AXIS_STYLES}
            interval="preserveStartEnd"
            minTickGap={isMobile ? 40 : 60}
            angle={0}
            allowDuplicatedCategory={false}
          />

          {/* Primary Y-Axis (Metric) */}
          <YAxis
            yAxisId="metric"
            {...AXIS_STYLES}
            tickFormatter={(value) => formatMetricValue(metric, value)}
            domain={[0, maxMetricValue]}
            width={60}
            hide={isMobile}
          />

          {/* Secondary Y-Axis (Overlay) */}
          {overlay && (
            <YAxis
              yAxisId="overlay"
              orientation="right"
              {...AXIS_STYLES}
              tickFormatter={(value) => `${Number(value).toFixed(1)}%`}
              domain={[0, overlayDomainMax]}
              width={50}
              hide={isMobile}
            />
          )}

          {/* Threshold Reference Lines */}
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

          {/* Tooltip */}
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || payload.length === 0) return null;
              const point = payload[0].payload as ChartDataPoint | undefined;
              if (!point) return null;
              return (
                <ChartTooltipContent
                  point={point}
                  metric={metric}
                  percentile={percentile}
                  overlay={overlay}
                  isPartialData={point.time === incompletePointLabel}
                />
              );
            }}
          />

          {/* Primary Area (Metric) */}
          <Area
            yAxisId="metric"
            type="monotone"
            dataKey="value"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#metricGradient)"
            connectNulls={false}
            dot={false}
            activeDot={ACTIVE_DOT_CONFIG("var(--chart-1)")}
          />

          {/* Secondary Area (Overlay) */}
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
              activeDot={ACTIVE_DOT_CONFIG("var(--chart-5)")}
            />
          )}

          {/* Incomplete data indicator */}
          {incompletePointLabel && (
            <ReferenceLine
              yAxisId="metric"
              x={incompletePointLabel}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          )}

          {/* Invisible scatter for tooltip on empty data points */}
          <Scatter yAxisId="metric" dataKey="hoverTarget" fill="transparent" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
