import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/src/lib/auth';
import { db } from '@/src/lib/db';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check for setup requirement first (direct DB query to avoid fetch issues)
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
    requiresSetup = true;
  }

  if (requiresSetup) {
    redirect('/setup');
  }

  // Check authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  return <>{children}</>;
}

