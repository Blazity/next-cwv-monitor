import { APIError } from 'better-auth';
import { auth } from '@/lib/auth';

export async function provisionInitialUser() {
  const initialEmail = process.env.INITIAL_USER_EMAIL;
  const initialPassword = process.env.INITIAL_USER_PASSWORD;
  const initialName = process.env.INITIAL_USER_NAME || 'Initial User';

  if (!initialEmail || !initialPassword) {
    console.warn('Provisioning skipped: INITIAL_USER_EMAIL/PASSWORD missing in env.');
    return;
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email: initialEmail,
        password: initialPassword,
        name: initialName
      }
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.message?.includes('User already exists.')) return;
    console.error('Failed to seed default user:', error);
  }
}
