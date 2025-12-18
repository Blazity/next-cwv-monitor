import type { ReactNode } from 'react';
import { Navbar } from '@/components/dashboard/navbar';
import { ProjectsListService } from '@/app/server/domain/projects/list/service';

const projectsService = new ProjectsListService();

async function DashboardLayout({ children }: { children: ReactNode }) {
  const projectsData = await projectsService.list();
  return (
    <>
      <Navbar projects={projectsData} />
      <main className="p-3 sm:p-4 lg:p-6">{children}</main>
    </>
  );
}

export default DashboardLayout;
