import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export function RouteHelpTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground inline-flex items-center transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="sr-only">What is a route pattern?</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="max-w-xs text-sm">
            <strong>Route patterns</strong> group URLs with dynamic segments. For example,{" "}
            <code className="bg-muted text-foreground rounded px-1">/blog/hello</code> and{" "}
            <code className="bg-muted text-foreground rounded px-1">/blog/world</code> are grouped under{" "}
            <code className="bg-muted text-foreground rounded px-1">/blog/[slug]</code>.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
