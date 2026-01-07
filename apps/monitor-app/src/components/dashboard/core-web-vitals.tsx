import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MetricCard } from "@/components/dashboard/metric-card";
import type { MetricOverviewItem } from "@/app/server/domain/dashboard/overview/types";
import { CORE_WEB_VITALS } from "@/consts/metrics";

type CoreWebVitalsProps = {
  metricOverview: MetricOverviewItem[];
};

export function CoreWebVitals({ metricOverview }: CoreWebVitalsProps) {
  const coreMetrics = CORE_WEB_VITALS.map((name) => {
    const data = metricOverview.find((m) => m.metricName === name);
    return (
      data || {
        metricName: name,
        quantiles: null,
        status: null,
        sampleSize: 0,
      }
    );
  });

  return (
    <TooltipProvider>
      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-foreground text-lg font-medium">Core Web Vitals</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex outline-none">
                <Info className="text-muted-foreground hover:text-foreground h-4 w-4 transition-colors" />
                <span className="sr-only">Metric information</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Core Web Vitals are the key metrics that Google uses to measure user experience: LCP, INP, and CLS.
                <br />
                P75 is the recommended percentile for assessment.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {coreMetrics.map((item) => (
            <MetricCard key={item.metricName} metric={item} />
          ))}
        </div>
      </section>
    </TooltipProvider>
  );
}
