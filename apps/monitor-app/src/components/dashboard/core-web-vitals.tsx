import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MetricCard } from '@/components/dashboard/metric-card';
import type { MetricName, MetricOverviewItem } from '@/app/server/domain/dashboard/overview/types';

type CoreWebVitalsProps = {
  metricOverview: MetricOverviewItem[];
}

const CORE_METRICS: Array<MetricName> = ['LCP', 'INP', 'CLS'];
export function CoreWebVitals({ metricOverview }: CoreWebVitalsProps) {

  const coreMetrics = CORE_METRICS.map((name) => {
    const data = metricOverview.find((m) => m.metricName === name);
    return data || { 
      metricName: name, 
      quantiles: null, 
      status: null, 
      sampleSize: 0 
    };
  });

  return (
    <TooltipProvider>
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-medium text-foreground">Core Web Vitals</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex outline-none">
                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
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
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {coreMetrics.map((item) => (
            <MetricCard key={item.metricName} metric={item} />
          ))}
        </div>
      </section>
    </TooltipProvider>
  );
}