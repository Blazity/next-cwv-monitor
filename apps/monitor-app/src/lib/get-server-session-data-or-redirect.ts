import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function getServerSessionDataOrRedirect() {
  const sessionData = await auth.api.getSession({
    headers: await headers()
  });

  if (!sessionData?.session) {
    redirect('/login');
  }

  return {
    session: sessionData.session,
    user: sessionData.user
  };
}
