'use client';

import { type ReactNode } from 'react';
import type { User, Session } from 'better-auth';
import { SessionContext } from './session-context';

type SessionProviderProps = {
  user: User;
  session: Session;
  children: ReactNode;
};

export function SessionProvider({ user, session, children }: SessionProviderProps) {
  return <SessionContext.Provider value={{ user, session }}>{children}</SessionContext.Provider>;
}
