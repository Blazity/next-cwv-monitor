import { provisionInitialUser } from '@/lib/provision-initial-user';

export async function register() {
  await provisionInitialUser();
}
