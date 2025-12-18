'use client';

import { authClient, Session } from '@/lib/auth-client';
import { createContext, useContext } from 'react';


interface SessionContextType {
  session: Session | null;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ 
  initialSession, 
  children 
}: { 
  initialSession: Session | null; 
  children: React.ReactNode; 
}) {
  return (
    <SessionContext.Provider value={{ session: initialSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
};