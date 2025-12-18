import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function requireAuth() {
  const sessionData = await auth.api.getSession({
    headers: await headers()
  });

  if (!sessionData || !sessionData.session || !sessionData.user) {
    throw new Error('Unauthorized');
  }

  return {
    session: sessionData.session,
    user: sessionData.user
  };
}
