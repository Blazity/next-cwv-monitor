import { use } from 'react';
import { SessionContext } from '@/contexts/session-context';

export function useSessionData() {
  const sessionData = use(SessionContext);
  
  if (sessionData === undefined) {
    throw new Error('useSession must be used within SessionProvider');
  }
  
  return sessionData; 
}

export function useUser() {
  const session = useSessionData();
  
  if (!session) {
    throw new Error("useUser was called on a protected page without a session.");
  }

  return session.user;
}
