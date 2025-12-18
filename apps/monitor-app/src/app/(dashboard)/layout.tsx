import React from 'react';
import { Navbar } from '@/components/dashboard/navbar';
import { ProjectsListService } from '@/app/server/domain/projects/list/service';
import { getServerSessionDataOrRedirect } from '@/lib/get-server-session-data-or-redirect';

const projectsService = new ProjectsListService();

async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getServerSessionDataOrRedirect();

  const projectsData = await projectsService.list();

  return (
    <>
      <Navbar projects={projectsData} user={user} />
      <main className="p-3 sm:p-4 lg:p-6">{children}</main>
    </>
  );
}

export default DashboardLayout;
