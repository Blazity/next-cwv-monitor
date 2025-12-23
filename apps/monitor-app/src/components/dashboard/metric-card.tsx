import { Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { METRIC_INFO } from "@/app/server/lib/cwv-metadata";
import { getMetricThresholds, getRatingForValue } from "@/app/server/lib/cwv-thresholds";
import { formatMetricValue, getMetricUnit } from '@/lib/cwv-data';
import { cn } from '@/lib/utils';
import PercentileChart from '@/components/dashboard/percentile-chart';
import type { MetricOverviewItem } from '@/app/server/domain/dashboard/overview/types';

const statusConfig = {
    good: { 
      icon: CheckCircle2, 
      label: "Good", 
      className: "text-status-good", 
      bg: "bg-status-good/10" 
    },
    'needs-improvement': { 
      icon: AlertTriangle, 
      label: "Needs improvement", 
      className: "text-status-needs-improvement", 
      bg: "bg-status-needs-improvement/10" 
    },
    poor: { 
      icon: XCircle, 
      label: "Poor", 
      className: "text-status-poor", 
      bg: "bg-status-poor/10" 
    },
  };

type MetricCardProps = {
  metric: MetricOverviewItem;
}  

export function MetricCard({ metric }: MetricCardProps) {
    const { metricName, quantiles, status } = metric;
    const info = METRIC_INFO[metricName];
    const thresholds = getMetricThresholds(metricName);
    const p75Value = quantiles?.p75 ?? 0;
    const unit = getMetricUnit(metricName);
    const config = status ? statusConfig[status] : null;
    const StatusIcon = config?.icon;
  
    if (!quantiles || !thresholds) {
        return (
              <Card className="bg-card border-border opacity-60">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div className="space-y-1">
                        <CardTitle className="text-lg">{info.friendlyLabel}</CardTitle>
                        <CardDescription className="font-medium">{metricName}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-4 border-t border-dashed mt-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">No Data Available</p>
                </CardContent>
            </Card>
        );
    }
  
    const percentileItems = ([
        { label: 'P50', value: quantiles.p50 },
        { label: 'P75', value: quantiles.p75 },
        { label: 'P90', value: quantiles.p90 },
        { label: 'P95', value: quantiles.p95 },
        { label: 'P99', value: quantiles.p99 },
      ] as const).map((p) => ({
        label: p.label,
        value: p.value,
        type: getRatingForValue(metricName, p.value) ?? 'good',
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
                  <p className="text-xs mt-1">{info.description}</p>
                </TooltipContent>
              </Tooltip>
            </CardDescription>
          </div>
  
          {config && (
            <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md", config.bg)} role="status" aria-label={`Status: ${config.label}`}>
              {StatusIcon && <StatusIcon className={cn("h-4 w-4", config.className)} aria-hidden="true" />}
              <span className={cn("text-xs font-medium", config.className)}>
                {config.label}
              </span>
            </div>
          )}
        </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-mono text-2xl font-semibold text-foreground">
            {formatMetricValue(unit, p75Value)}
          </span>
          <span className="text-sm text-muted-foreground">P75</span>
        </div>
          <PercentileChart
            title="View all percentiles"
            value={p75Value}
            metric={metricName}
            thresholds={thresholds}
            percentiles={percentileItems}
            fixedPercentile={true}
          />
      </CardContent>
    </Card>
  );
}