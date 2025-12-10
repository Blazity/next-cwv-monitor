import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/src/lib/auth';
import { db } from '@/src/lib/db';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // First check if setup is required (no users exist)
  // If setup is required, allow access to auth pages without session check
  let requiresSetup = false;
  try {
    const result = await db.query({
      query: 'SELECT count() as count FROM user',
      format: 'JSONEachRow',
    });
    const rows = (await result.json()) as { count: string }[];
    const userCount = Number(rows[0]?.count) || 0;
    requiresSetup = userCount === 0;
  } catch {
    // If table doesn't exist or error, setup is required
    requiresSetup = true;
  }

  // If setup is required, just render children (allow access to setup page)
  if (requiresSetup) {
    return <>{children}</>;
  }

  // If users exist, check if already authenticated
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session) {
      redirect('/dashboard');
    }
  } catch {
    // If session check fails, just render children (login page)
  }

  return <>{children}</>;
}

