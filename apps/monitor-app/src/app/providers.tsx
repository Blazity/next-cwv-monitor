'use client';

import * as React from 'react';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster position="bottom-right" theme="system" />
    </NextThemesProvider>
  );
}
