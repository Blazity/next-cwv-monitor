import { CreateUserBtn } from '@/components/users/create-user-btn';
import UsersList from '@/components/users/users-list';
import UsersStats from '@/components/users/users-stats';
import { adminAuth, auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

export default async function UsersPage() {
  if (
    !adminAuth.admin.checkRolePermission({
      role: 'admin',
      permission: { user: ['list'] }
    })
  ) {
    notFound();
  }

  const { users, total } = await auth.api.listUsers({ query: {}, headers: await headers() });

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
