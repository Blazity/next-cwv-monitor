"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RefreshCw, Timer, TimerOff } from "lucide-react";
import { formatDistance } from "date-fns";
import { env } from "@/env";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { formatCountdown } from "@/lib/format-countdown";

const AUTO_REFRESH_INTERVAL_SECONDS = env.NEXT_PUBLIC_AUTO_REFRESH_INTERVAL_SECONDS;
const ONE_SECOND_MS = 1000;

const formatLastUpdated = (date: Date) => {
  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffInSeconds < 60) {
    return "just now";
  }
  return formatDistance(date, new Date(), { addSuffix: true, includeSeconds: true });
};

export function DataRefreshControl() {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isPending, startTransition] = useTransition();
  const [, setTick] = useState(0);

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setLastUpdated(new Date());
    });
  }, [router]);

  const autoRefresh = useAutoRefresh(handleRefresh, isPending);

  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), ONE_SECOND_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-xs">
      <span>Updated {formatLastUpdated(lastUpdated)}</span>
      <TooltipProvider>
        <div className="flex items-center gap-1">
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

          <div className="bg-border mx-1 h-3 w-px" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={autoRefresh.toggle}
                className={cn("hover:bg-accent flex items-center gap-1 rounded px-1.5 py-1 transition-colors", {
                  "bg-muted text-muted-foreground hover:bg-muted/80": autoRefresh.enabled,
                })}
              >
                {autoRefresh.enabled ? (
                  <>
                    <Timer className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{autoRefresh.formattedCountdown}</span>
                  </>
                ) : (
                  <TimerOff className="h-3.5 w-3.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {autoRefresh.enabled
                  ? "Disable auto-refresh"
                  : `Enable auto-refresh (${formatCountdown(AUTO_REFRESH_INTERVAL_SECONDS)})`}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
