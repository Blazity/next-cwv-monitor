import { Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { METRIC_INFO } from '@/app/server/lib/cwv-metadata';
import { getMetricThresholds, getRatingForValue } from '@/app/server/lib/cwv-thresholds';
import { formatMetricValue } from '@/lib/utils';
import PercentileChart from '@/components/dashboard/percentile-chart';
import type { MetricOverviewItem } from '@/app/server/domain/dashboard/overview/types';
import { Badge } from '@/components/badge';

const STATUS_MAP = {
  good: { type: 'success', label: 'Good' },
  'needs-improvement': { type: 'warning', label: 'Needs improvement' },
  poor: { type: 'error', label: 'Poor' }
} as const;

type MetricCardProps = {
  metric: MetricOverviewItem;
};

export function MetricCard({ metric }: MetricCardProps) {
  const { metricName, quantiles, status } = metric;
  const info = METRIC_INFO[metricName];
  const thresholds = getMetricThresholds(metricName);
  const p75Value = quantiles?.p75 ?? 0;

  if (!quantiles) {
    return (
      <Card className="bg-card border-border opacity-60">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg">{info.friendlyLabel}</CardTitle>
            <CardDescription className="font-medium">{metricName}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="mt-2 flex flex-col items-center justify-center border-t border-dashed py-4">
          <p className="text-muted-foreground text-xs tracking-wider uppercase">No Data Available</p>
        </CardContent>
      </Card>
    );
  }

  const percentileItems = (
    [
      { label: 'P50', value: quantiles.p50 },
      { label: 'P75', value: quantiles.p75 },
      { label: 'P90', value: quantiles.p90 },
      { label: 'P95', value: quantiles.p95 },
      { label: 'P99', value: quantiles.p99 }
    ] as const
  ).map((p) => ({
    label: p.label,
    value: p.value,
    type: getRatingForValue(metricName, p.value)
  }));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg">{info.friendlyLabel}</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span className="font-medium">{metricName}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">{info.name}</p>
                <p className="mt-1 text-xs">{info.description}</p>
              </TooltipContent>
            </Tooltip>
          </CardDescription>
        </div>
        {status && (
          <Badge type={STATUS_MAP[status].type} label={STATUS_MAP[status].label} defaultIcon />
        )}
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-foreground font-mono text-2xl font-semibold">
            {formatMetricValue(metricName, p75Value)}
          </span>
          <span className="text-muted-foreground text-sm">P75</span>
        </div>
        <PercentileChart
          title="View all percentiles"
          metric={metricName}
          thresholds={thresholds}
          percentiles={percentileItems}
          selectedLabel="P75"
          fixedPercentile
        />
      </CardContent>
    </Card>
  );
}
