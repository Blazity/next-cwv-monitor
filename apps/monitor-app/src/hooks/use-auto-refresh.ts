import { useState, useEffect, useCallback } from "react";
import { formatCountdown } from "@/lib/format-countdown";

type UseAutoRefreshProps = {
  onRefresh: () => void;
  isPending: boolean;
  autoRefreshIntervalSeconds: number;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
};

export function useAutoRefresh({
  onRefresh,
  isPending,
  autoRefreshIntervalSeconds,
  enabled,
  setEnabled,
}: UseAutoRefreshProps) {
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(autoRefreshIntervalSeconds);

  useEffect(() => {
    if (enabled) {
      onRefresh();
    }
  }, [enabled, onRefresh]);

  useEffect(() => {
    if (!enabled || isPending) {
      return;
    }

    const targetTime = Date.now() + autoRefreshIntervalSeconds * 1000;

    const countdownInterval = setInterval(() => {
      const now = Date.now();

      if (now >= targetTime) {
        clearInterval(countdownInterval);
        onRefresh();
        return;
      }

      const remaining = Math.max(1, Math.ceil((targetTime - now) / 1000));
      setSecondsUntilRefresh(remaining);
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
      setSecondsUntilRefresh(autoRefreshIntervalSeconds);
    };
  }, [enabled, isPending, onRefresh, autoRefreshIntervalSeconds]);

  const toggle = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled, setEnabled]);

  return {
    enabled,
    toggle,
    formattedCountdown: formatCountdown(secondsUntilRefresh),
  };
}
