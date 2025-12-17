'use client';

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();

export async function logout() {
  try {
    await authClient.signOut();
    globalThis.location.href = '/login';
  } catch (error) {
    console.error('Logout failed:', error);
    globalThis.location.href = '/login';
  }
}
