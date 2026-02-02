"use client";

import { useTransition } from "react";
import { LogOut, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/server/actions/sign-out";
import { cn, hasAnyRoleOf } from "@/lib/utils";
import { ADMIN_ROLES } from "@/lib/auth-shared";
import { SessionData } from "@/lib/auth";

export function UserActionsMobile({
  setMobileMenuOpen,
  user,
}: {
  setMobileMenuOpen: (open: boolean) => void;
  user: SessionData["user"];
}) {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  const handleSignOut = () => {
    setMobileMenuOpen(false);
    startTransition(async () => {
      await signOut();
    });
  };

  return (
    <div className="border-border mt-auto border-t p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-foreground truncate text-sm font-medium">{user.name}</p>
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
        </div>
      </div>
      {hasAnyRoleOf(user.role, ADMIN_ROLES) && (
        <Link
          href="/users"
          onClick={() => setMobileMenuOpen(false)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
            pathname === "/users"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
          )}
        >
          <Users className="h-4 w-4" />
          Users
        </Link>
      )}
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isPending}
        className="text-muted-foreground hover:text-foreground hover:bg-accent/50 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
        {isPending ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
