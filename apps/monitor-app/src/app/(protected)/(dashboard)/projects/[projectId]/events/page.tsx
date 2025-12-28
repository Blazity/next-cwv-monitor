import { getAuthorizedSession } from "@/lib/auth-utils";

async function EventsPage() {
  await getAuthorizedSession();
  return <div>EventsPage</div>;
}

export default EventsPage;
