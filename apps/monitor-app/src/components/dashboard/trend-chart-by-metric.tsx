'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TimeSeriesChart } from '@/components/dashboard/time-series-chart';
import { MetricSelector } from '@/components/dashboard/metric-selector';
import type { DashboardOverview } from '@/app/server/domain/dashboard/overview/types';
import type { MetricName } from '@/app/server/domain/dashboard/overview/types';

type TrendChartByMetricProps = {
  timeSeriesByMetric: DashboardOverview['timeSeriesByMetric'];
  initialMetric?: MetricName;
  title?: string;
};

export function TrendChartByMetric({
  timeSeriesByMetric,
  initialMetric = 'LCP',
  title = 'Trend Over Time'
}: TrendChartByMetricProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricName>(initialMetric);
  const data = timeSeriesByMetric[selectedMetric];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-foreground text-lg font-medium">{title}</CardTitle>
          <MetricSelector selected={selectedMetric} onChange={setSelectedMetric} showOtherMetrics />
        </div>
      </CardHeader>
      <CardContent>
        <TimeSeriesChart data={data} metric={selectedMetric} height={300} />
        <div className="text-muted-foreground mt-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="bg-status-good h-px w-8 opacity-50"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, var(--status-good) 0, var(--status-good) 4px, transparent 4px, transparent 8px)'
              }}
            />
            <span>Good threshold</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="bg-status-poor h-px w-8 opacity-50"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, var(--status-poor) 0, var(--status-poor) 4px, transparent 4px, transparent 8px)'
              }}
            />
            <span>Poor threshold</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
