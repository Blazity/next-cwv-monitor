"use client";

import { useTransition } from "react";
import { LogOut, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { SessionData } from "@/lib/auth-client";
import { signOut } from "@/app/server/actions/sign-out";
import Link from "next/link";
import { hasAnyRoleOf } from "@/lib/utils";
import { ADMIN_ROLES } from "@/lib/auth-shared";

type SessionUser = SessionData["user"];

export function UserDropdown({ user }: { user: SessionUser }) {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="bg-muted text-muted-foreground hover:bg-accent hidden h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors sm:flex">
        {user.name.charAt(0).toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-foreground text-sm font-medium">{user.name}</p>
          <p className="text-muted-foreground text-xs">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        {hasAnyRoleOf(user.role, ADMIN_ROLES) && (
          <>
            <DropdownMenuItem asChild className="text-muted-foreground">
              <Link href="/users">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem className="text-muted-foreground" onClick={handleSignOut} disabled={isPending}>
          <LogOut className="mr-2 h-4 w-4" />
          {isPending ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
