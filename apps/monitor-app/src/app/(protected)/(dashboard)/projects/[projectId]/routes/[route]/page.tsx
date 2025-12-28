import { PageHeader } from '@/components/dashboard/page-header';
import { getAuthorizedSession } from '@/lib/auth-utils';

async function RoutePage() {
  await getAuthorizedSession();
  return (
    <div>
      <PageHeader title="Single route" description="Route page" />
    </div>
  );
}

export default RoutePage;
