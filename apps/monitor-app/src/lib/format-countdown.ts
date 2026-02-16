export function formatCountdown(seconds: number) {
  const clamped = Math.max(1, Math.round(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;

  if (m === 0) return `${s}s`;
  if (m === 1 && s === 0) return `${clamped}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}
