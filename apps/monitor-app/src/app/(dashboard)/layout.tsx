import React from 'react';
import { Navbar } from '@/components/dashboard/navbar';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProjectsListService } from '@/app/server/domain/projects/list/service';

async function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const sessionData = await auth.api.getSession({
    headers: await headers()
  });

  if (!sessionData?.session || !sessionData.user) {
    redirect('/login');
  }

  const projectsService = new ProjectsListService();
  const projectsData = await projectsService.list();

  return (
    <>
      <Navbar projects={projectsData} user={sessionData.user} />
      <main className="p-3 sm:p-4 lg:p-6">{children}</main>
    </>
  );
}

export default ProjectsLayout;
