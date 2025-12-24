'use client';

import { SessionData } from '@/lib/auth';
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