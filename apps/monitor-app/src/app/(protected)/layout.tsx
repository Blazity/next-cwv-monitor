import { Suspense, type ReactNode } from 'react';
import { SessionProvider } from '@/contexts/session-provider';
import { getServerSessionDataOrRedirect } from '@/lib/auth-utils';

async function ProtectedLayoutContent({ children }: { children: ReactNode }) {
  const sessionData = await getServerSessionDataOrRedirect();
  return <SessionProvider initialSessionData={sessionData}>{children}</SessionProvider>;
}

function ProtectedLayoutLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        <div className="text-muted-foreground text-sm">Authenticating...</div>
      </div>
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ProtectedLayoutLoading />}>
      <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
    </Suspense>
  );
}
