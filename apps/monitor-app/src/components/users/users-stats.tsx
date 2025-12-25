import { Card } from '@/components/ui/card';
import { AdminApiResult } from '@/lib/auth';
import { Shield, Users } from 'lucide-react';

type Props = {
  users: AdminApiResult<'listUsers'>['users'];
  total: number;
};

export default function UsersStats({ users, total }: Props) {
  const admins = users.filter((u) => u.role === 'admin');

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="bg-card border-border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
            <Users className="text-muted-foreground h-5 w-5" />
          </div>
          <div>
            <div className="text-muted-foreground text-sm">Total Users</div>
            <div className="text-foreground text-2xl font-semibold">{total}</div>
          </div>
        </div>
      </Card>
      <Card className="bg-card border-border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/15 flex h-10 w-10 items-center justify-center rounded-lg">
            <Shield className="text-primary h-5 w-5" />
          </div>
          <div>
            <div className="text-muted-foreground text-sm">Admins</div>
            <div className="text-foreground text-2xl font-semibold">{admins.length}</div>
          </div>
        </div>
      </Card>
      <Card className="bg-card border-border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
            <Users className="text-muted-foreground h-5 w-5" />
          </div>
          <div>
            <div className="text-muted-foreground text-sm">Regular Users</div>
            <div className="text-foreground text-2xl font-semibold">{total - admins.length}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
