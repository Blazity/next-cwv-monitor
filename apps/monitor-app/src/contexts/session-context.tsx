'use client';

import { createContext } from 'react';
import type { User, Session } from 'better-auth';

type SessionContextValue = {
  user: User;
  session: Session;
};

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);
