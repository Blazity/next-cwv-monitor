import { Info } from "lucide-react";

import { Badge as StatusBadge } from "@/components/badge";
import { statusToBadge } from "@/consts/status-to-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PercentileChart from "@/components/dashboard/percentile-chart";
import { formatMetricValue } from "@/lib/utils";
import { getMetricThresholds, getRatingForValue } from "@/app/server/lib/cwv-thresholds";
import { METRIC_INFO } from "@/app/server/lib/cwv-metadata";
import type { MetricName, Percentile } from "@/app/server/domain/routes/list/types";
import type { QuantileSummary } from "@/app/server/domain/routes/detail/types";

type RouteMetricCardProps = {
  metricName: MetricName;
  quantiles: QuantileSummary | null;
  sampleSize: number;
  selectedPercentile: Percentile;
};

function getPercentileValue(quantiles: QuantileSummary | null, percentile: Percentile): number | null {
  if (!quantiles) return null;
  return quantiles[percentile];
}

export function RouteMetricCard({ metricName, quantiles, sampleSize, selectedPercentile }: RouteMetricCardProps) {
  const info = METRIC_INFO[metricName];
  const thresholds = getMetricThresholds(metricName);
  const value = getPercentileValue(quantiles, selectedPercentile);
  const status = typeof value === "number" ? getRatingForValue(metricName, value) : null;

  if (!quantiles) {
    return (
      <Card className="bg-card border-border opacity-60">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg">{info.friendlyLabel}</CardTitle>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span className="font-medium">{metricName}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="border-border mt-2 flex flex-col items-center justify-center border-t border-dashed py-4">
          <p className="text-muted-foreground text-xs tracking-wider uppercase">No Data Available</p>
        </CardContent>
      </Card>
    );
  }

  const percentileItems = (
    [
      { label: "P50", value: quantiles.p50 },
      { label: "P75", value: quantiles.p75 },
      { label: "P90", value: quantiles.p90 },
      { label: "P95", value: quantiles.p95 },
      { label: "P99", value: quantiles.p99 },
    ] as const
  ).map((p) => ({ label: p.label, value: p.value, type: getRatingForValue(metricName, p.value) }));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg">{info.friendlyLabel}</CardTitle>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span className="font-medium">{metricName}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="hover:text-foreground transition-colors">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">{info.name}</p>
                <p className="mt-1 text-xs">{info.description}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        {status && <StatusBadge {...statusToBadge[status]} size="sm" />}
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-foreground font-mono text-2xl font-semibold">
              {typeof value === "number" ? formatMetricValue(metricName, value) : "--"}
            </span>
            <span className="text-muted-foreground text-sm">{selectedPercentile.toUpperCase()}</span>
          </div>
          <span className="text-muted-foreground text-xs">{sampleSize.toLocaleString()} samples</span>
        </div>

        <PercentileChart
          title="View all percentiles"
          metric={metricName}
          selectedLabel={selectedPercentile.toUpperCase()}
          thresholds={thresholds}
          percentiles={percentileItems}
        />
      </CardContent>
    </Card>
  );
}
