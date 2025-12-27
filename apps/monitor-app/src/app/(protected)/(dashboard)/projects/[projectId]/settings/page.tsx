import { getAuthorizedSession } from '@/app/server/lib/auth-check';

async function SettingsPage() {
  await getAuthorizedSession();
  return <div>SettingsPage</div>;
}

export default SettingsPage;
