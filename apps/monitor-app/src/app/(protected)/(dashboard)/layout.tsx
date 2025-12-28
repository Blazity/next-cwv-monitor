import type { ReactNode } from 'react';
import { Navbar } from '@/components/dashboard/navbar';
import { projectsListService } from '@/app/server/domain/projects/list/service';

async function DashboardLayout({ children }: { children: ReactNode }) {
  const projectsData = await projectsListService.list();
  return (
    <>
      <Navbar projects={projectsData} />
      <main className="p-3 sm:p-4 lg:p-6">{children}</main>
    </>
  );
}

export default DashboardLayout;
