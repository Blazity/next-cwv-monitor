"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { formatDistance } from "date-fns";
import { TooltipProvider } from "@radix-ui/react-tooltip";

export function DataFreshnessIndicator() {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isPending, startTransition] = useTransition();
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
      setLastUpdated(new Date());
    });
  };

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-xs">
      <span>Updated {formatDistance(lastUpdated, new Date(), { addSuffix: true })}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isPending}
              className="hover:bg-accent rounded p-1 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", { "animate-spin": isPending })} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh data</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
