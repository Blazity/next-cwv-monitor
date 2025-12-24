import { auth, SessionData } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

export type AuthResult = 
| { kind: 'authorized'; session: SessionData["session"]; user: SessionData["user"]; } 
| { kind: 'unauthorized'; };

const getSession = cache(async () => {
  try {
    return await auth.api.getSession({
      headers: await headers()
    });
  } catch {
    return null;
  }
});

export async function getAuthorizedSession(): Promise<AuthResult> {
  const sessionData = await getSession();

  if (!sessionData) {
    return { kind: 'unauthorized' };
  }

  return {
    kind: 'authorized',
    ...sessionData
  };
}

export async function getServerSessionDataOrRedirect(): Promise<SessionData> {
  const result = await getAuthorizedSession();

  if (result.kind === 'authorized') {
    return result;
  }

  return await redirectToLogin();
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