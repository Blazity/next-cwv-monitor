import { useState, useEffect, useCallback } from "react";
import { env } from "@/env";
import { formatCountdown } from "@/lib/format-countdown";

const AUTO_REFRESH_INTERVAL_SECONDS = env.NEXT_PUBLIC_AUTO_REFRESH_INTERVAL_SECONDS;

export function useAutoRefresh(onRefresh: () => void, isPending: boolean) {
  const [enabled, setEnabled] = useState(false);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(AUTO_REFRESH_INTERVAL_SECONDS);

  useEffect(() => {
    if (enabled) {
      onRefresh();
    }
  }, [enabled, onRefresh]);

  useEffect(() => {
    if (!enabled || isPending) {
      return;
    }

    const targetTime = Date.now() + AUTO_REFRESH_INTERVAL_SECONDS * 1000;

    const countdownInterval = setInterval(() => {
      const now = Date.now();

      if (now >= targetTime) {
        onRefresh();
        return;
      }

      const remaining = Math.max(1, Math.ceil((targetTime - now) / 1000));
      setSecondsUntilRefresh(remaining);
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
      setSecondsUntilRefresh(AUTO_REFRESH_INTERVAL_SECONDS);
    };
  }, [enabled, isPending, onRefresh]);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  return {
    enabled,
    toggle,
    formattedCountdown: formatCountdown(secondsUntilRefresh),
  };
}
