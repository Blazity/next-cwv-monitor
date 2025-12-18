'use client';

import { Session } from '@/lib/auth-client';
import { useMemo } from 'react';
import { SessionContext } from './session-context';

export function SessionProvider({
  initialSession,
  children
}: {
  initialSession: Session | null;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ session: initialSession }), [initialSession]);

  return (
    <SessionContext value={value}>
      {children}
    </SessionContext>
  );
}
