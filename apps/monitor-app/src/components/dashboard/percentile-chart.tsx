import { MetricName } from "@/app/server/domain/dashboard/overview/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatMetricValue } from "@/lib/utils";
import { WebVitalRatingV1 } from "cwv-monitor-contracts";
import { ChevronDown } from "lucide-react";

type Props = {
  percentiles: { label: string; value: number; type: WebVitalRatingV1 }[];
  thresholds: { good: number; needsImprovement: number };
  fixedPercentile?: boolean;
  title: string;
  value: number;
  metric: MetricName;
};

export default function PercentileChart({ percentiles, thresholds, title, metric, fixedPercentile, value }: Props) {
  const maxPercentileValue = Math.max(...percentiles.map((p) => p.value));
  const activeTileValue = percentiles.filter((p) => p.value > value).toSorted((a, b) => a.value - b.value)[0].value;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
        >
          {title}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="bg-popover text-popover-foreground border-border w-64 p-3" align="start">
        <div className="space-y-2">
          <div className="text-muted-foreground mb-3 text-xs font-medium">Percentile Distribution</div>
          {percentiles.map((p) => {
            const barWidth = maxPercentileValue > 0 ? (p.value / maxPercentileValue) * 100 : 0;
            return (
              <div
                key={p.label}
                className="ring-foreground/20 relative flex items-center justify-between overflow-hidden rounded px-2 py-1 ring-1"
              >
                <div
                  className={cn("absolute inset-y-0 left-0 rounded", {
                    "bg-status-good/20": p.type === "good",
                    "bg-status-needs-improvement/20": p.type === "needs-improvement",
                    "bg-status-poor/20": p.type === "poor"
                  })}
                  style={{ width: `${barWidth}%` }}
                />
                <span
                  className={cn("text-muted-foreground relative text-sm", {
                    "text-foreground font-medium": activeTileValue === p.value
                  })}
                >
                  {p.label}
                  {!fixedPercentile && activeTileValue === p.value && " (selected)"}
                </span>
                <span className="text-foreground relative font-mono text-sm">{formatMetricValue(metric, p.value)}</span>
              </div>
            );
          })}
          <div className="border-border mt-3 border-t pt-2">
            <div className="text-muted-foreground text-xs">
              Thresholds: Good ≤ {formatMetricValue(metric, thresholds.good)}, Poor &gt;{" "}
              {formatMetricValue(metric, thresholds.needsImprovement)}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
