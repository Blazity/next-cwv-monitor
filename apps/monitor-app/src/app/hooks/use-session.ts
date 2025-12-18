import { use } from 'react';
import { SessionContext } from '@/contexts/session-context';

export function useSession() {
  const context = use(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
