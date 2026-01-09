'use client';

import { useState } from 'react';
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Menu, Users, Activity } from 'lucide-react';
import Link from 'next/link';
import { cn, hasAnyRoleOf } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useUser } from '@/app/hooks/use-session';
import { NavItem } from '@/components/dashboard/nav-items';
import { UserActionsMobile } from '@/components/dashboard/user-actions-mobile';
import { ADMIN_ROLES } from '@/lib/auth-shared';
import { PersistParamsLink } from '@/components/dashboard/persist-params-link';

export function MobileSheet({ navItems }: { navItems: NavItem[] }) {
  const user = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <button
          className="text-muted-foreground hover:text-foreground hover:bg-accent flex h-9 w-9 items-center justify-center rounded-md transition-colors lg:hidden"
          aria-label="Open menu"
          type="button"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <div className="flex h-full flex-col">
          <div className="border-border flex items-center gap-2 border-b p-4">
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-md">
              <Activity className="text-primary-foreground h-4 w-4" />
            </div>
            <span className="text-foreground font-semibold">CWV Monitor</span>
          </div>
          <nav className="flex flex-col gap-1 p-2">
            {navItems.map((item) => {
              const isActive = item.isExact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <PersistParamsLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    { 'bg-accent text-accent-foreground': isActive }
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </PersistParamsLink>
              );
            })}
            {hasAnyRoleOf(user.role, ADMIN_ROLES) && (
              <>
                <div className="bg-border my-2 h-px" />
                <Link
                  href="/users"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname === '/users'
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  <Users className="h-4 w-4" />
                  Users
                </Link>
              </>
            )}
          </nav>
          <UserActionsMobile setMobileMenuOpen={setMobileMenuOpen} user={user} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
