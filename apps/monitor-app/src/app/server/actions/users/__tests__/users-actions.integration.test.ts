import { randomUUID } from 'node:crypto';

import type { StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { setupClickHouseContainer } from '@/test/clickhouse-test-utils';

let container: StartedTestContainer;
let sql: typeof import('@/app/server/lib/clickhouse/client').sql;

let currentHeaders = new Headers();

vi.mock('next/cache', () => ({
  updateTag: vi.fn()
}));

vi.mock('next/headers', () => ({
  headers: async () => currentHeaders
}));

function getSetCookies(headers: Headers): string[] {
  const maybe = headers as unknown as { getSetCookie?: () => string[] };
  if (typeof maybe.getSetCookie === 'function') return maybe.getSetCookie();

  const raw = headers.get('set-cookie');
  if (!raw) return [];

  return [raw];
}

function toCookieHeader(setCookies: string[]): string {
  return setCookies
    .map((cookie) => cookie.split(';')[0])
    .filter(Boolean)
    .join('; ');
}

async function resetAuthTables(): Promise<void> {
  const tables = ['user', 'session', 'account', 'verification'] as const;
  for (const table of tables) {
    await sql.unsafe(`TRUNCATE TABLE IF EXISTS ${table}`).command();
    await sql.unsafe(`OPTIMIZE TABLE ${table} FINAL`).command();
  }
}

async function signUpUser(params: { email: string; password: string; name: string }): Promise<{ userId: string }> {
  const { auth } = await import('@/lib/auth');
  const res = await auth.api.signUpEmail({ body: params });
  return { userId: res.user.id };
}

async function promoteUserToAdmin(userId: string): Promise<void> {
  const rows = await sql<{
    id: string;
    name: string;
    email: string;
    email_verified: boolean;
    image: string | null;
    created_at: string | Date;
    banned: boolean;
    is_password_temporary: boolean;
    ban_reason: string | null;
    ban_expires: string | Date | null;
  }>`
    SELECT
      id,
      name,
      email,
      email_verified,
      image,
      created_at,
      banned,
      is_password_temporary,
      ban_reason,
      ban_expires
    FROM user FINAL
    WHERE id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  const user = rows[0];
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const createdAtSeconds = Math.floor(new Date(user.created_at).getTime() / 1000);
  const updatedAtSeconds = Math.floor(Date.now() / 1000);

  await sql`
    INSERT INTO user (
      id,
      name,
      email,
      email_verified,
      image,
      created_at,
      updated_at,
      role,
      banned,
      is_password_temporary,
      ban_reason,
      ban_expires
    )
    VALUES (
      ${user.id},
      ${user.name},
      ${user.email},
      ${user.email_verified},
      ${user.image},
      toDateTime(${createdAtSeconds}),
      toDateTime(${updatedAtSeconds}),
      ${'admin'},
      ${user.banned},
      ${user.is_password_temporary},
      ${user.ban_reason},
      ${null}
    )
  `.command();
}

async function signInAndSetRequestCookies(params: { email: string; password: string }): Promise<void> {
  const { auth } = await import('@/lib/auth');
  const response = await auth.api.signInEmail({ body: params, asResponse: true });
  const cookieHeader = toCookieHeader(getSetCookies(response.headers));
  currentHeaders = new Headers(cookieHeader ? { cookie: cookieHeader } : {});
}

async function setupAdminSession(): Promise<void> {
  const email = `admin+${randomUUID()}@example.com`;
  const password = 'Password1234!';

  const { userId } = await signUpUser({ email, password, name: 'Admin User' });
  await promoteUserToAdmin(userId);
  await signInAndSetRequestCookies({ email, password });
}

async function listUserById(userId: string) {
  const { auth } = await import('@/lib/auth');
  const res = await auth.api.listUsers({
    query: { filterOperator: 'eq', filterField: 'id', filterValue: userId },
    headers: currentHeaders
  });
  return res.users[0] ?? null;
}

describe('users server actions (integration)', () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;
    ({ sql } = await import('@/app/server/lib/clickhouse/client'));
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await resetAuthTables();
    currentHeaders = new Headers();
    vi.resetModules();
  });

  describe('createUserAction', () => {
    it('creates a new user (admin session) and returns a temp password', async () => {
      await setupAdminSession();

      const { createUserAction } = await import('../create-user');

      const email = `member+${randomUUID()}@example.com`;
      const result = await createUserAction({ email, name: 'Member User', role: 'member' });

      expect(result.success).toBe(true);
      expect(typeof result.tempPassword).toBe('string');
      expect((result.tempPassword ?? '').length).toBeGreaterThanOrEqual(12);

      const { auth } = await import('@/lib/auth');
      const users = await auth.api.listUsers({
        query: { filterOperator: 'eq', filterField: 'email', filterValue: email },
        headers: currentHeaders
      });
      expect(users.users).toHaveLength(1);
      expect(users.users[0]?.role).toBe('member');
      expect(users.users[0]?.isPasswordTemporary).toBe(true);
    });

    it('rejects invalid payloads before calling auth', async () => {
      await setupAdminSession();

      const { createUserAction } = await import('../create-user');
      const result = await createUserAction({ email: 'not-an-email', name: '', role: 'member' });
      expect(result).toMatchObject({ success: false, message: 'Invalid user schema' });
    });
  });

  describe('setRoleAction', () => {
    it('sets user role for an unbanned user', async () => {
      await setupAdminSession();
      const { setRoleAction } = await import('../update-user');

      const email = `user+${randomUUID()}@example.com`;
      const password = 'Password1234!';
      const { userId } = await signUpUser({ email, password, name: 'Test User' });

      const result = await setRoleAction({ userId, newRole: 'admin' });
      expect(result).toMatchObject({ success: true });

      const user = await listUserById(userId);
      expect(user?.role).toBe('admin');
    });

    it('rejects role changes for banned users', async () => {
      await setupAdminSession();
      const { setRoleAction } = await import('../update-user');

      const { auth } = await import('@/lib/auth');

      const email = `user+${randomUUID()}@example.com`;
      const password = 'Password1234!';
      const { userId } = await signUpUser({ email, password, name: 'Banned User' });

      await auth.api.banUser({ body: { userId, banReason: 'DISABLED' }, headers: currentHeaders });

      const result = await setRoleAction({ userId, newRole: 'admin' });
      expect(result).toMatchObject({ success: false, message: 'You cannot change this user role' });
    });
  });

  describe('deleteUserAction', () => {
    it('deletes a non-admin user', async () => {
      await setupAdminSession();
      const { deleteUserAction } = await import('../delete-user');

      const email = `user+${randomUUID()}@example.com`;
      const password = 'Password1234!';
      const { userId } = await signUpUser({ email, password, name: 'Deletable User' });

      const result = await deleteUserAction(userId);
      expect(result).toMatchObject({ success: true });

      const user = await listUserById(userId);
      expect(user).toBeNull();
    });

    it('refuses to delete an admin user', async () => {
      await setupAdminSession();
      const { deleteUserAction } = await import('../delete-user');

      const email = `admin2+${randomUUID()}@example.com`;
      const password = 'Password1234!';
      const { userId } = await signUpUser({ email, password, name: 'Another Admin' });
      await promoteUserToAdmin(userId);

      const result = await deleteUserAction(userId);
      expect(result).toMatchObject({ success: false, message: "You can't remove admin" });
    });
  });

  describe('toggleAccountStatusAction', () => {
    it('disables and enables a user for the DISABLED reason', async () => {
      await setupAdminSession();
      const { toggleAccountStatusAction } = await import('../toggle-user-status');

      const email = `user+${randomUUID()}@example.com`;
      const password = 'Password1234!';
      const { userId } = await signUpUser({ email, password, name: 'Toggle User' });

      const disabled = await toggleAccountStatusAction(userId, null);
      expect(disabled).toMatchObject({ success: true });

      const afterDisable = await listUserById(userId);
      expect(afterDisable?.banned).toBe(true);
      expect(afterDisable?.banReason).toBe('DISABLED');

      const enabled = await toggleAccountStatusAction(userId, 'DISABLED');
      expect(enabled).toMatchObject({ success: true });

      const afterEnable = await listUserById(userId);
      expect(afterEnable?.banned).toBe(false);
      expect(afterEnable?.banReason).toBeNull();
    });

    it('refuses to toggle when user is disabled for a different reason', async () => {
      await setupAdminSession();
      const { toggleAccountStatusAction } = await import('../toggle-user-status');

      const email = `user+${randomUUID()}@example.com`;
      const password = 'Password1234!';
      const { userId } = await signUpUser({ email, password, name: 'Toggle User' });

      const result = await toggleAccountStatusAction(userId, 'SOME_OTHER_REASON');
      expect(result).toMatchObject({ success: false, message: 'User is disabled for a different reason' });
    });
  });
});
