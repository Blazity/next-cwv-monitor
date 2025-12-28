import { SessionData } from '@/lib/auth';
import { createContext } from 'react';

export const SessionContext = createContext<SessionData | null | undefined>(undefined);