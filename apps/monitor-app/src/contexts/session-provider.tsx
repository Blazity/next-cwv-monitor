'use client';

import { useEffect, useMemo, useRef } from 'react';
import { SessionContext } from '@/contexts/session-context';
import { auth } from '@/lib/auth';

export function SessionProvider({
  initialSessionData,
  children
}: {
  // NOTE: This provider is currently used only under `app/(protected)` where the layout redirects
  // on missing sessions (so `initialSessionData` is always non-null at runtime).
  //
  // If we ever want to reuse this provider outside protected routes, change this to accept
  // `SessionData | null` and guard `value.user` access accordingly.
  initialSessionData: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
  children: React.ReactNode;
}) {
  const value = useMemo(() => initialSessionData, [initialSessionData]);
  const wasAskedForChange = useRef(false);

  useEffect(() => {
    if (value.user.isPasswordTemporary && wasAskedForChange.current === false) {
      // FIXME: replace with a proper forced password-change UX.
      alert('TODO: change password');
      wasAskedForChange.current = true;
    }
  }, [value]);

  return <SessionContext value={value}>{children}</SessionContext>;
}
