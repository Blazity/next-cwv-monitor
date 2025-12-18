import type { ReactNode } from 'react';
import { Navbar } from '@/components/dashboard/navbar';
import { ProjectsListService } from '@/app/server/domain/projects/list/service';
import { getServerSessionDataOrRedirect } from '@/lib/get-server-session-data-or-redirect';
import { SessionProvider } from '@/contexts/session-provider';

const projectsService = new ProjectsListService();

async function DashboardLayout({ children }: { children: ReactNode }) {
  const [sessionData, projectsData] = await Promise.all([getServerSessionDataOrRedirect(), projectsService.list()]);
  const { user, session } = sessionData;
  return (
    <SessionProvider user={user} session={session}>
      <Navbar projects={projectsData} />
      <main className="p-3 sm:p-4 lg:p-6">{children}</main>
    </SessionProvider>
  );
}

export default DashboardLayout;
