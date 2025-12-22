"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { User } from "better-auth";
import { signOut } from "@/actions/sign-out";

export function UserDropdown({ user }: { user: User }) {
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
        <DropdownMenuItem className="text-muted-foreground" onClick={handleSignOut} disabled={isPending}>
          <LogOut className="mr-2 h-4 w-4" />
          {isPending ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
