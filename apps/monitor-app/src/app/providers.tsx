'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <NuqsAdapter>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <Toaster position="bottom-right" theme="system" richColors />
      </NextThemesProvider>
    </NuqsAdapter>
  );
}
