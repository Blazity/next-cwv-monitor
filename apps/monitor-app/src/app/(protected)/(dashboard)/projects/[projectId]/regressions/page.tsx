import { getAuthorizedSession } from '@/app/server/lib/auth-check';

async function RegressionsPage() {
  await getAuthorizedSession();
  return <div>RegressionsPage</div>;
}

export default RegressionsPage;
