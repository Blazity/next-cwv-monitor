'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import Link from 'next/link';
import { Activity, Users } from 'lucide-react';
import { useParams, usePathname } from 'next/navigation';
import { cn, hasRoles } from '@/lib/utils';
import { type ListProjectsResult } from '@/app/server/domain/projects/list/types';
import { useUser } from '@/app/hooks/use-session';
import { ProjectSelector } from '@/components/dashboard/projects-selector';
import { MobileSheet } from '@/components/dashboard/mobile-sheet';
import { getNavItems } from '@/components/dashboard/nav-items';
import { ThemeToggle } from '@/components/dashboard/theme-toggle';
import { UserDropdown } from '@/components/dashboard/user-dropdown';
import { ADMIN_ROLES } from '@/lib/auth-shared';

type NavbarProps = {
  projects: ListProjectsResult;
};

export function Navbar({ projects }: NavbarProps) {
  const user = useUser();
  const pathname = usePathname();
  const params = useParams<{ projectId: string | undefined }>();
  const projectId = params.projectId;

  const navItems = getNavItems(projectId);
  return (
    <TooltipProvider>
      <header className="border-border bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
        <div className="flex h-14 items-center justify-between px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <MobileSheet navItems={navItems} />
            <Link href="/projects" className="flex items-center gap-2">
              <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-md">
                <Activity className="text-primary-foreground h-4 w-4" />
              </div>
              <span className="text-foreground hidden font-semibold sm:inline">CWV Monitor</span>
            </Link>

            <div className="hidden sm:block">
              <ProjectSelector projects={projects} />
            </div>

            <nav className="hidden items-center gap-1 lg:flex">
              {navItems.map((item) => {
                const isActive = item.isExact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              {hasRoles(user.role, ADMIN_ROLES) && (
                <Link
                  href="/users"
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    pathname === '/users'
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  <Users className="h-4 w-4" />
                  Users
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
            <div className="sm:hidden">
              <ProjectSelector projects={projects} />
            </div>

            <ThemeToggle />
            <UserDropdown user={user} />
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
