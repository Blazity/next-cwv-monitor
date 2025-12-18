export function getNormalizedRoute(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
}

export function getFullPath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname || '/';
}

