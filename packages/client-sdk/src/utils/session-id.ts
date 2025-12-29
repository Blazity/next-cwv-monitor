export function generateSessionId(): string {
  return (
    (typeof crypto !== 'undefined' && crypto.randomUUID?.()) || `s${Date.now()}${Math.random().toString(16).slice(2)}`
  );
}
