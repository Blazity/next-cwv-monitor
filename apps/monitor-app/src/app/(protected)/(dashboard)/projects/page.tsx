import { getAuthorizedSession } from '@/app/server/lib/auth-check';

async function ProjectsPage() {
  await getAuthorizedSession();
  return <div>ProjectsPage</div>;
}

export default ProjectsPage;
