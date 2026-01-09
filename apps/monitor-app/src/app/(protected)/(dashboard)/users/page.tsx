import { CreateUserBtn } from '@/components/users/create-user-btn';
import { NoPermission } from '@/components/no-permission';
import UsersList from '@/components/users/users-list';
import UsersStats from '@/components/users/users-stats';
import { auth } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/auth-shared';
import { getAuthorizedSession } from '@/lib/auth-utils';
import { hasAnyRoleOf } from '@/lib/utils';
import { cacheTag } from 'next/cache';
import { headers } from 'next/headers';

const fetchCachedUsers = async (headers: HeadersInit) => {
  'use cache';
  cacheTag('users');
  return auth.api.listUsers({ query: {}, headers });
};

export default async function UsersPage() {
  const session = await getAuthorizedSession();
  if (!hasAnyRoleOf(session.user.role, ADMIN_ROLES)) {
    return <NoPermission title="No permission" description="You don't have permission to manage users." />;
  }
  const data = await fetchCachedUsers(await headers());
  const { total, users } = data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground text-sm">Manage user accounts and permissions</p>
        </div>
        <CreateUserBtn />
      </div>
      <UsersStats users={users} total={total} />
      <UsersList users={users} />
    </div>
  );
}
