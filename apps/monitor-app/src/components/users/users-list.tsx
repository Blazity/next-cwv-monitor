"use client";

import { useUser } from "@/app/hooks/use-session";
import { deleteUserAction } from "@/app/server/actions/users/delete-user";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Ban, Key, MoreHorizontal, Search, Shield, ShieldCheck, ShieldOff, Trash2, Users } from "lucide-react";
import { useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import { setRoleAction } from "@/app/server/actions/users/set-role-user";
import { toggleAccountStatusAction } from "@/app/server/actions/users/toggle-user-status";
import { UserWithRole } from "better-auth/plugins";
import { checkBanReason } from "@/app/server/lib/ban-reasons";
import { toast } from "sonner";
import { cn, formatDate, hasAnyRoleOf } from "@/lib/utils";
import { useAction } from "next-safe-action/hooks";
import { resetPasswordAction } from "@/app/server/actions/users/reset-password";
import { CredentialsDialog } from "@/components/users/credentials-dialog";
import { ADMIN_ROLES } from "@/lib/auth-shared";

type Props = {
  users: UserWithRole[];
};

export default function UsersList({ users }: Props) {
  const currentUser = useUser();
  const [resetData, setResetData] = useState<{ email: string; password: string } | null>(null);
  const [userToReset, setUserToReset] = useState<UserWithRole | null>(null);

  const deleteAction = useAction(deleteUserAction, {
    onSuccess: () => toast.success("User deleted"),
    onError: ({ error }) => toast.error(error.serverError || "Failed to delete user"),
  });

  const roleAction = useAction(setRoleAction, {
    onSuccess: () => toast.success("Role updated"),
    onError: ({ error }) => toast.error(error.serverError || "Failed to change role"),
  });

  const statusAction = useAction(toggleAccountStatusAction, {
    onSuccess: ({ data }) => {
      if (data.success === false) {
        toast.error(data.message);
      } else {
        toast.success("Status updated");
      }
    },
    onError: ({ error }) => toast.error(error.serverError || "Failed to set user status"),
  });

  const resetAction = useAction(resetPasswordAction, {
    onSuccess: ({ data }) => {
      if (userToReset) {
        toast.success("Password reset");
        setResetData({
          email: userToReset.email,
          password: data.tempPassword,
        });
      }
    },
    onError: ({ error }) => toast.error(error.serverError || "Failed to reset password"),
  });

  const handleCloseReset = () => {
    setResetData(null);
    setUserToReset(null);
  };

  const isAnyPending =
    deleteAction.isPending || roleAction.isPending || statusAction.isPending || resetAction.isPending;

  const [searchQuery, setSearchQuery] = useQueryState("q");

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const lowSearch = searchQuery.toLowerCase();
    return users.filter(
      (user) => user.name.toLowerCase().includes(lowSearch) || user.email.toLowerCase().includes(lowSearch),
    );
  }, [searchQuery, users]);

  const handleDeleteUser = (user: UserWithRole) => {
    deleteAction.execute({ userId: user.id });
  };

  const handleToggleRole = (user: UserWithRole) => {
    const newRole = user.role === "admin" ? "member" : "admin";
    roleAction.execute({ newRole, userId: user.id });
  };

  const handleToggleUserStatus = (user: UserWithRole) => {
    statusAction.execute({
      userId: user.id,
      currentStatus: user.banReason,
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
            value={searchQuery ?? ""}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background border-border pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filteredUsers.map((user) => {
            const isDisabled = checkBanReason(user.banReason, "disableAccount");
            return (
              <div
                key={user.id}
                className={cn("border-border bg-background flex items-center justify-between rounded-lg border p-4", {
                  "opacity-50": isDisabled,
                })}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-full font-medium select-none">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground truncate text-sm font-medium">{user.name}</span>
                      {hasAnyRoleOf(user.role, ADMIN_ROLES) && (
                        <Badge variant="secondary" className="text-xs">
                          Admin
                        </Badge>
                      )}
                      {isDisabled && (
                        <Badge variant="outline" className="text-xs">
                          Disabled
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
                    Joined {formatDate(user.createdAt)}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setUserToReset(user)}
                        disabled={!!user.banned || hasAnyRoleOf(user.role, ["admin"])}
                      >
                        <Key className="mr-2 h-4 w-4" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleUserStatus(user)}
                        disabled={user.role === "admin" || currentUser.id === currentUser.email || isAnyPending}
                      >
                        {isDisabled ? (
                          <>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Enable User
                          </>
                        ) : (
                          <>
                            <Ban className="mr-2 h-4 w-4" />
                            Disable User
                          </>
                        )}
                      </DropdownMenuItem>
                      {/* TODO: Consider which admin is better than other admin to avoid cases where any admin can remove admin from different admins */}
                      <DropdownMenuItem
                        onClick={() => handleToggleRole(user)}
                        disabled={currentUser.email === user.email || !!user.banned}
                      >
                        {hasAnyRoleOf(user.role, ADMIN_ROLES) ? (
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
                            disabled={currentUser.email === user.email || isDisabled || hasAnyRoleOf(user.role, ADMIN_ROLES)}
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
                              disabled={isAnyPending}
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
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="text-muted-foreground mb-3 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                {searchQuery ? `No users matching "${searchQuery}"` : "No users found"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CredentialsDialog
        open={!!userToReset}
        onOpenChange={(open) => {
          if (!open) handleCloseReset();
        }}
        title="Reset Password"
        description={`Are you sure you want to reset the password for ${userToReset?.name}? This will generate a new temporary password.`}
        successTitle="Password Reset Successful"
        result={resetData}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={handleCloseReset}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={resetAction.isPending}
            onClick={() => userToReset && resetAction.execute({ userId: userToReset.id })}
          >
            {resetAction.isPending ? "Resetting..." : "Confirm Reset"}
          </Button>
        </div>
      </CredentialsDialog>
    </Card>
  );
}
