'use client';

import { ProjectRow } from '@/app/server/lib/clickhouse/schema';
import { TooltipProvider } from '@/components/ui/tooltip';
import UserDropdown from './user-dropdown';
import { ProjectSelector } from './projects-selector';
import Link from 'next/link';
import { useMemo } from 'react';
import { LayoutDashboard, Route, TrendingDown, Calendar, Settings, Activity, Users } from 'lucide-react';
import { useParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MobileSheet } from './mobile-sheet';
import { ThemeToggle } from './theme-toggle';
import { User } from 'better-auth';

type NavbarProps = {
  projects: ProjectRow[];
  user: User;
};

export function getNavItems(projectId: string | undefined) {
  if (!projectId) {
    return [];
  }
  return [
    { href: `/projects/${projectId}`, label: 'Overview', icon: LayoutDashboard, isExact: true },
    { href: `/projects/${projectId}/routes`, label: 'Routes', icon: Route },
    { href: `/projects/${projectId}/regressions`, label: 'Regressions', icon: TrendingDown },
    { href: `/projects/${projectId}/events`, label: 'Events', icon: Calendar },
    { href: `/projects/${projectId}/settings`, label: 'Settings', icon: Settings }
  ];
}

export type NavItem = ReturnType<typeof getNavItems>[number];

export function Navbar({ projects, user }: NavbarProps) {
  const pathname = usePathname();
  const params = useParams<{ projectId: string | undefined }>();
  const projectId = params.projectId;

  const navItems = useMemo(() => getNavItems(projectId), [projectId]);

  return (
    <TooltipProvider>
      <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
        <div className="flex h-14 items-center justify-between px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <MobileSheet navItems={navItems} user={user} />
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
              {/* {user?.role === 'admin' && ( */}
              {true && (
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
