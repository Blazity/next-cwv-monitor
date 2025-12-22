'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';

import { Badge } from '@/components/badge';
import { statusToBadge } from '@/consts/status-to-badge';
import { formatMetricValue } from '@/lib/utils';
import { getMetricThresholds } from '@/app/server/lib/cwv-thresholds';
import type { DashboardOverview } from '@/app/server/domain/dashboard/overview/types';
import type { MetricName } from '@/app/server/domain/dashboard/overview/types';
import type { WebVitalRatingV1 } from 'cwv-monitor-contracts';

type DailySeriesPoint = DashboardOverview['timeSeriesByMetric'][MetricName][number];

type TimeSeriesChartProps = {
  data: DailySeriesPoint[];
  metric: MetricName;
  height?: number;
};

type ChartDataPoint = {
  timestamp: string;
  value: number | null;
  samples: number;
  status: WebVitalRatingV1 | null;
  time: string;
};

export function TimeSeriesChart({ data, metric, height = 300 }: TimeSeriesChartProps) {
  const chartData = React.useMemo(() => {
    return data.map((point): ChartDataPoint => {
      const value = point.quantiles?.p75 ?? null;
      const date = new Date(point.date);

      return {
        timestamp: point.date,
        value,
        samples: point.sampleSize,
        status: point.status,
        time: date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric'
        })
      };
    });
  }, [data]);

  const thresholds = getMetricThresholds(metric);
  if (!thresholds) {
    return <div>Invalid metric: {metric}</div>;
  }

  const maxValue = Math.max(
    ...data.map((d) => d.quantiles?.p75 ?? null).filter((v): v is number => v !== null),
    thresholds.needsImprovement * 1.1
  );

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)' }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            yAxisId="metric"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)' }}
            tickFormatter={(value) => formatMetricValue(metric, value)}
            domain={[0, maxValue]}
            width={60}
          />
          {/* Good threshold */}
          <ReferenceLine
            yAxisId="metric"
            y={thresholds.good}
            stroke="var(--status-good)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          {/* Poor threshold */}
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
              const point = payload[0].payload as ChartDataPoint | undefined;
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
                      <span className="text-foreground text-sm">{metric}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-mono text-sm font-medium">
                          {formatMetricValue(metric, point.value)}
                        </span>
                        {point.status && <Badge {...statusToBadge[point.status]} label={undefined} size="sm" />}
                      </div>
                    </div>
                    <div className="text-muted-foreground text-xs">{point.samples.toLocaleString()} tracked views</div>
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
              fill: 'var(--chart-1)',
              stroke: 'var(--background)',
              strokeWidth: 2
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
