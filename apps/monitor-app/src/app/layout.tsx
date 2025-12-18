import type { Metadata } from 'next';
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';

import './globals.css';

import { auth } from '@/lib/auth';
import { Providers } from './providers';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk'
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono'
});

export const metadata: Metadata = {
  title: 'CWV Monitor',
  description: 'Core Web Vitals monitoring'
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth.api
  .getSession({
    headers: await headers(),
  })
  .catch((error) => {
    console.warn('Auth session fetch failed:', error);
    return null;
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers sessionData={session}>{children}</Providers>
      </body>
    </html>
  );
}
