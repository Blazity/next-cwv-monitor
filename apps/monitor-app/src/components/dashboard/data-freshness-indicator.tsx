"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function DataFreshnessIndicator() {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 500);
  };

  return (
    <div className="text-muted-foreground flex items-center gap-2 text-xs">
      <span>Updated {getRelativeTime(lastUpdated)}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="hover:bg-accent rounded p-1 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Refresh data</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
