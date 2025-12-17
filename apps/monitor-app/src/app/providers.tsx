'use client';

import * as React from 'react';

import { SessionProvider } from '@/contexts/session-context';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { Session } from '@/lib/auth-client';

interface ProvidersProps {
  children: React.ReactNode;
  session: Session | null;
}

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider initialSession={session}>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <Toaster position="bottom-right" theme="system" />
      </NextThemesProvider>
    </SessionProvider>
  );
}
