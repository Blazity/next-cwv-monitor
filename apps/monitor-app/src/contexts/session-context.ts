import { Session } from '@/lib/auth-client';
import { createContext } from 'react';

export type SessionContextType = {
  session: Session | null;
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined);