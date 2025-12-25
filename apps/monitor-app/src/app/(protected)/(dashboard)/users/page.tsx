import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import { CreateUserBtn } from '@/components/users/create-user-btn';
import UsersList from '@/components/users/users-list';
import UsersStats from '@/components/users/users-stats';
import { adminAuth } from '@/lib/auth';
import { cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

async function getCachedUsers() {
  'use cache';
  cacheTag('users');
  return adminAuth.admin.listUsers({ query: {} });
}

export default async function UsersPage() {
  try {
    adminAuth.admin.checkRolePermission({
      role: 'admin',
      permission: { user: ['list'] }
    });
    await getAuthorizedSession(['admin']);
  } catch {
    notFound();
  }

  let users;
  try {
    users = await getCachedUsers();
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground text-sm">Manage user accounts and permissions</p>
        </div>
        <CreateUserBtn />
      </div>
      <UsersStats users={users} />
      <UsersList users={users} />
    </div>
  );
}
