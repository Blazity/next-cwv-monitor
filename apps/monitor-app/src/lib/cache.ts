export const CACHE_LIFE_DEFAULT = {
  stale: 30,
  revalidate: 30,
  // Next.js requires expire > revalidate.
  expire: 31,
} as const;
