import { auth, SessionData } from '@/lib/auth';
import type { Route } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

const DEFAULT_CALLBACK_URL: Route = '/projects';

export class UnauthorizedError extends Error {
  constructor() {
    super("User is not authorized");
    this.name = "UnauthorizedError";
  }
}

export const getAuthorizedSession = cache(async (): Promise<SessionData> => {
  const session = await auth.api.getSession({
    headers: await headers()
  }).catch(() => null);

  if (!session) {
    throw new UnauthorizedError();
  }

  return session;
});

export function getSafeCallbackUrl(value: string | string[] | undefined, fallback: Route = DEFAULT_CALLBACK_URL): Route {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;
  if (raw.includes('\\')) return fallback;
  return raw as Route;
}

export async function getServerSessionDataOrRedirect(): Promise<SessionData> {
  try {
    return await getAuthorizedSession();
  } catch {
    return await redirectToLogin();
  }
}

export async function redirectToLogin(): Promise<never> {
  const headerList = await headers();
  
  const currentPathStr = 
    headerList.get('x-current-path') ||
    headerList.get('referer');

  let callbackPath = '/';

  if (currentPathStr) {
    try {
      // Create a dummy URL to safely parse path when set with referer header (absolute)
      const url = new URL(currentPathStr, 'http://localhost');
      callbackPath = url.pathname + url.search;
    } catch {
      callbackPath = currentPathStr;
    }
  }

  if (callbackPath.startsWith('/login')) {
    redirect('/');
  }

  const searchParams = new URLSearchParams();
  if (callbackPath && callbackPath !== '/') {
    searchParams.set('callbackUrl', callbackPath);
  }

  const queryString = searchParams.toString();
  redirect(queryString ? `/login?${queryString}` : '/login');
}
