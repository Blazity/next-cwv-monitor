import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export function RegressionsHelpTooltip() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex items-center transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="sr-only">About regressions</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <div className="space-y-2 text-sm">
          <p>
            <strong>Regressions</strong> are route + metric pairs where the <strong>P75</strong> value in the selected
            time range is worse than in the previous, equally-sized period.
          </p>
          <p>
            <strong>Critical</strong> counts regressions that are currently in the <strong>poor</strong> range for that
            metric.
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
