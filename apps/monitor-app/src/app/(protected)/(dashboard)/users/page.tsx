import { getAuthorizedSession } from '@/app/server/lib/auth-check';

async function UsersPage() {
  await getAuthorizedSession();
  return <div>UsersPage</div>;
}

export default UsersPage;
