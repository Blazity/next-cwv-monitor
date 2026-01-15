import { formatDuration, intervalToDuration } from "date-fns";

export function formatCountdown(seconds: number) {
  const duration = intervalToDuration({ start: 0, end: Math.max(1, seconds) * 1000 });
  return formatDuration(duration, { format: ["minutes", "seconds"], zero: false })
    .replace(" minutes", "m")
    .replace(" minute", "m")
    .replace(" seconds", "s")
    .replace(" second", "s");
}
