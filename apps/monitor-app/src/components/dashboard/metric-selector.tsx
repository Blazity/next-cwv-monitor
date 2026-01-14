"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { METRIC_NAMES, type MetricName } from "@/app/server/domain/dashboard/overview/types";

const METRIC_INFO: Record<
  MetricName,
  {
    name: string;
    description: string;
    isCoreWebVital: boolean;
  }
> = {
  LCP: {
    name: "Largest Contentful Paint",
    description: "Measures loading performance. Marks the point when the largest content element becomes visible.",
    isCoreWebVital: true,
  },
  INP: {
    name: "Interaction to Next Paint",
    description: "Measures interactivity. Evaluates the responsiveness of a page to user interactions.",
    isCoreWebVital: true,
  },
  CLS: {
    name: "Cumulative Layout Shift",
    description: "Measures visual stability. Quantifies how much visible content shifts during page load.",
    isCoreWebVital: true,
  },
  FCP: {
    name: "First Contentful Paint",
    description: "Measures when the first content (text or image) is painted to the screen.",
    isCoreWebVital: false,
  },
  TTFB: {
    name: "Time to First Byte",
    description: "Measures the time between requesting a resource and when the first byte arrives from the server.",
    isCoreWebVital: false,
  },
};

function isCoreWebVital(metric: MetricName): metric is MetricName {
  return METRIC_INFO[metric].isCoreWebVital;
}

const CORE_WEB_VITALS = METRIC_NAMES.filter((metric) => isCoreWebVital(metric));
const OTHER_METRICS = METRIC_NAMES.filter((metric) => !isCoreWebVital(metric));

type MetricSelectorProps = {
  selected: MetricName;
  onChange: (metric: MetricName) => void;
  showOtherMetrics?: boolean;
  metrics?: MetricName[];
};

export function MetricSelector({ selected, onChange, showOtherMetrics = false, metrics }: MetricSelectorProps) {
  const displayMetrics = metrics || (showOtherMetrics ? [...CORE_WEB_VITALS, ...OTHER_METRICS] : CORE_WEB_VITALS);

  return (
    <TooltipProvider>
      <div className="bg-muted flex w-fit items-center gap-1 rounded-lg p-1" role="tablist">
        {displayMetrics.map((metric) => {
          const info = METRIC_INFO[metric];
          const isOther = !info.isCoreWebVital;

          return (
            <Tooltip key={metric}>
              <TooltipTrigger asChild>
                <button
                  role="tab"
                  type="button"
                  aria-selected={selected === metric}
                  onClick={() => onChange(metric)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    selected === metric
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                    isOther && selected !== metric && "opacity-70",
                  )}
                >
                  {metric}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{info.name}</span>
                    {!info.isCoreWebVital && (
                      <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">
                        Not a CWV
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">{info.description}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
