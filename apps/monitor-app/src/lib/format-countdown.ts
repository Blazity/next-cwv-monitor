export function formatCountdown(seconds: number) {
  const clamped = Math.max(1, Math.round(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;

  if (m === 0) return `${s}s`;
  if (s === 0) return `${clamped}s`;
  return `${m}m ${s}s`;
}
