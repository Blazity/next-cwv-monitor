import { use } from 'react';
import { SessionContext } from '@/contexts/session-context';

export const useSession = () => {
  const context = use(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
};