'use client';

import { useEffect, useMemo, useRef } from 'react';
import { SessionContext } from '@/contexts/session-context';
import { auth } from '@/lib/auth';

export function SessionProvider({
  initialSessionData,
  children
}: {
  initialSessionData: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
  children: React.ReactNode;
}) {
  const value = useMemo(() => initialSessionData, [initialSessionData]);
  const wasAskedForChange = useRef(false);

  useEffect(() => {
    if (value.user.isPasswordTemporary && wasAskedForChange.current === false) {
      alert('TODO: change password');
      wasAskedForChange.current = true;
    }
  }, [value]);

  return <SessionContext value={value}>{children}</SessionContext>;
}
