'use client';

import { SessionData as SessionData } from '@/lib/auth-client';
import { useMemo } from 'react';
import { SessionContext } from '@/contexts/session-context';

export function SessionProvider({ initialSessionData, children }: {
  initialSessionData: SessionData | null;
  children: React.ReactNode;
}) {
  const value = useMemo(() => initialSessionData, [initialSessionData]);

  return (
    <SessionContext value={value}>
      {children}
    </SessionContext>
  );
}