'use client';

import { useUser } from '@/app/hooks/use-session';
import { deleteUserAction } from '@/app/server/actions/users/delete-user';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Key, MoreHorizontal, Search, Shield, ShieldOff, Trash2, Users } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useMemo, useTransition } from 'react';
import { AdminApiResult } from '@/lib/auth';
import { setRoleAction } from '@/app/server/actions/users/update-user';

type Props = {
  users: AdminApiResult<'listUsers'>['users'];
};

const handleResetPassword = (_user: unknown) => {
  //
  // TODO: we have to send this password anyway
};

export default function UsersList({ users }: Props) {
  const [isPending, startTransition] = useTransition();
  const currentUser = useUser();
  const [searchQuery, setSearchQuery] = useQueryState('q');
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    // TODO: consider should be it case sensitive or not. Now it is case sensitive
    return users.filter((user) => user.name.includes(searchQuery) || user.email.includes(searchQuery));
  }, [searchQuery, users]);

  const handleDeleteUser = (user: Props['users'][number]) => {
    startTransition(async () => {
      await deleteUserAction(user.email);
    });
  };

  const handleToggleRole = (user: Props['users'][number]) => {
    startTransition(async () => {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await setRoleAction({ newRole, userId: user.id });
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage user accounts, roles, and access</CardDescription>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search users..."
            value={searchQuery ?? ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background border-border pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <div
              // TODO: remove idx, it is temporary untill email is not unique
              key={user.email}
              className="border-border bg-background flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-full font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground truncate text-sm font-medium">{user.name}</span>
                    {user.role === 'admin' && (
                      <Badge variant="secondary" className="text-xs">
                        Admin
                      </Badge>
                    )}
                    {currentUser.email === user.email && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs">{user.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground hidden text-xs sm:inline">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                      <Key className="mr-2 h-4 w-4" />
                      Reset Password
                    </DropdownMenuItem>
                    {/* TODO: Consider which admin is better than other admin to avoid cases where any admin can remove admin from different admins */}
                    <DropdownMenuItem
                      onClick={() => handleToggleRole(user)}
                      disabled={currentUser.email === user.email}
                    >
                      {user.role === 'admin' ? (
                        <>
                          <ShieldOff className="mr-2 h-4 w-4" />
                          Remove Admin
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Make Admin
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          disabled={currentUser.email === user.email}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {user.name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={isPending}
                            onClick={() => handleDeleteUser(user)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="text-muted-foreground mb-3 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                {searchQuery ? `No users matching "${searchQuery}"` : 'No users found'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
