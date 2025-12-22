export type NextParams = Record<string, string | string[] | undefined>;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/**
 * Reconstruct a parameterized route template from App Router runtime values:
 * - pathname: `/blog/hello-world`
 * - params: `{ slug: "hello-world" }`
 * -> `/blog/[slug]`
 *
 * Notes:
 * - This is best-effort and may be ambiguous if static segments collide with param values.
 * - Catch-all params (string[]) are turned into `[...param]` when a contiguous match is found.
 */
export function reconstructAppRouterRoute(pathname: string, params: NextParams): string {
  const cleanPathname = pathname?.trim() || '/';
  const segments = cleanPathname.split('/').filter(Boolean);
  if (segments.length === 0) return '/';

  const result: Array<string | null> = [...segments];

  const entries = Object.entries(params ?? {});

  // 1) Catch-all params first (string[])
  const arrayParams = entries
    .filter(([, value]) => isStringArray(value) && value.length > 0)
    .map(([key, value]) => [key, value as string[]] as const)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [key, value] of arrayParams) {
    const len = value.length;
    for (let i = 0; i <= segments.length - len; i++) {
      // Skip ranges already collapsed by a previous (longer) match
      if (result.slice(i, i + len).some((s) => s === null)) continue;

      const matches = value.every((v, j) => segments[i + j] === v);
      if (!matches) continue;

      result[i] = `[...${key}]`;
      for (let j = 1; j < len; j++) result[i + j] = null;
      break;
    }
  }

  // 2) Scalar params (string)
  for (const [key, value] of entries) {
    if (typeof value !== 'string') continue;

    for (let i = 0; i < segments.length; i++) {
      const current = result[i];
      const segment = segments[i];

      if (current == null) continue;
      if (segment == null) continue;
      if (current.startsWith('[')) continue;

      if (segment === value) {
        result[i] = `[${key}]`;
      }
    }
  }

  return '/' + result.filter(Boolean).join('/');
}


