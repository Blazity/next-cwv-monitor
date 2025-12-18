'use client';

import * as React from 'react';

import { SessionProvider } from '@/contexts/session-provider';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { SessionData } from '@/lib/auth-client';

type ProvidersProps = {
  children: React.ReactNode;
  sessionData: SessionData | null;
}

export function Providers({ children, sessionData }: ProvidersProps) {
  return (
    <SessionProvider initialSessionData={sessionData}>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <Toaster position="bottom-right" theme="system" />
      </NextThemesProvider>
    </SessionProvider>
  );
}
