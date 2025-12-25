import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import { CreateUserBtn } from '@/components/users/create-user-btn';

async function UsersPage() {
  // TODO: verify whether user has access to users page
  const { user: _ } = await getAuthorizedSession();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground text-sm">Manage user accounts and permissions</p>
        </div>
        <CreateUserBtn />
      </div>
    </div>
  );
}

export default UsersPage;
