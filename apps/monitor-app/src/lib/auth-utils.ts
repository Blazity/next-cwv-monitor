import { auth, SessionData } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

export class UnauthorizedError extends Error {
  constructor() {
    super("User is not authorized");
    this.name = "UnauthorizedError";
  }
}

const getSession = cache(async () => {
  try {
    return await auth.api.getSession({
      headers: await headers()
    });
  } catch {
    return null;
  }
});

export async function getAuthorizedSession(): Promise<SessionData> {
  const sessionData = await getSession();

  if (!sessionData) {
    throw new UnauthorizedError();
  }

  return sessionData;
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