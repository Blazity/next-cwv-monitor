"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RefreshCw, Timer, TimerOff } from "lucide-react";
import { formatDistance } from "date-fns";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { formatCountdown } from "@/lib/format-countdown";
import { autoRefreshParser, SEARCH_QUERY_OPTIONS } from "@/lib/search-params";
import { useQueryState } from "nuqs";

const AUTO_REFRESH_INTERVAL_SECONDS = 60;
const ONE_SECOND_MS = 1000;

const formatLastUpdated = (date: Date) => {
  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffInSeconds < 10) {
    return "a couple of seconds ago";
  }
  if (diffInSeconds < 30) {
    return "less than 30 seconds ago";
  }

  return formatDistance(date, new Date(), { addSuffix: true });
};

export function DataRefreshControl() {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [isPending, startTransition] = useTransition();
  const [_tick, setTick] = useState(0);

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useQueryState(
    "autoRefresh",
    autoRefreshParser.withOptions(SEARCH_QUERY_OPTIONS),
  );

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setLastUpdated(new Date());
    });
  }, [router]);

  const handleSetAutoRefresh = useCallback(
    (enabled: boolean) => {
      void setAutoRefreshEnabled(enabled || null);
    },
    [setAutoRefreshEnabled],
  );

  const autoRefresh = useAutoRefresh({
    onRefresh: handleRefresh,
    isPending,
    autoRefreshIntervalSeconds: AUTO_REFRESH_INTERVAL_SECONDS,
    enabled: autoRefreshEnabled,
    setEnabled: handleSetAutoRefresh,
  });

  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), ONE_SECOND_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-status-good bg-status-good/10 flex h-8 items-center gap-2 rounded-full ps-3 text-[0.9375rem] font-bold">
      <span>Updated {formatLastUpdated(lastUpdated)}</span>
      <TooltipProvider>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleRefresh}
                aria-label="Refresh data"
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
                className="hover:bg-accent flex h-8 items-center gap-1.5 rounded-full px-2.5 transition-colors"
                aria-pressed={autoRefresh.enabled}
                aria-label={
                  autoRefresh.enabled
                    ? "Disable auto-refresh"
                    : `Enable auto-refresh (${formatCountdown(AUTO_REFRESH_INTERVAL_SECONDS)})`
                }
              >
                {autoRefresh.enabled ? (
                  <>
                    <Timer className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[0.9375rem] font-medium tabular-nums">{autoRefresh.formattedCountdown}</span>
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
