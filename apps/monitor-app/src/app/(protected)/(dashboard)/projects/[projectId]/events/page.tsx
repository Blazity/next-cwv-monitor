import { getAuthorizedSession } from '@/app/server/lib/auth-check';

async function EventsPage() {
  await getAuthorizedSession();
  return <div>EventsPage</div>;
}

export default EventsPage;
