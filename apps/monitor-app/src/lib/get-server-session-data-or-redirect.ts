import { auth } from './auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function getServerSessionDataOrRedirect() {
  const resolvedHeaders = await headers();
  const sessionData = await auth.api.getSession({ headers: resolvedHeaders });

  if (!sessionData?.session || !sessionData?.user) {
    const currentPath = resolvedHeaders.get("x-current-path"); 
    const loginUrl = currentPath ? `/login?callbackUrl=${encodeURIComponent(currentPath)}` : '/login';
    
    redirect(loginUrl);
  }

  return sessionData;
}
