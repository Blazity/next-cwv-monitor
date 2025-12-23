import { Suspense, type ReactNode } from 'react';
import { SessionProvider } from '@/contexts/session-provider';
import { getServerSessionDataOrRedirect } from '@/lib/get-server-session-data-or-redirect';
import { ProjectsListService } from '@/app/server/domain/projects/list/service';
import { Navbar } from '@/components/dashboard/navbar';

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

const projectsService = new ProjectsListService();
async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const projectsData = await projectsService.list();
  return (
    <>
      <Navbar projects={projectsData} />
      <main className="p-3 sm:p-4 lg:p-6">{children}</main>
    </>
  );
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ProtectedLayoutLoading />}>
      <ProtectedLayoutContent>
        <DashboardLayout>{children}</DashboardLayout>
      </ProtectedLayoutContent>
    </Suspense>
  );
}
