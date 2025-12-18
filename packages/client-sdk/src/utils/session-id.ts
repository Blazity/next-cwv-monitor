export function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older environments / test runners without `crypto.randomUUID`.
  return `s-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
