'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Route,
  TrendingDown,
  Calendar,
  Activity,
  Menu,
  Users,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { logout } from '@/lib/auth-client';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems = [
  {
    href: '/projects',
    label: 'Projects',
    icon: LayoutDashboard,
    isExact: false,
  },
  {
    href: '/routes',
    label: 'Routes',
    icon: Route,
    isExact: false,
  },
  {
    href: '/metrics',
    label: 'Metrics',
    icon: TrendingDown,
    isExact: false,
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: Calendar,
    isExact: false,
  },
];

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface HeaderProps {
  user?: User | null;
  isProjectScoped?: boolean;
}

export function Header({ user, isProjectScoped = false }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                className="lg:hidden flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 p-4 border-b border-border">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                    <Activity className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="font-semibold text-foreground">CWV Monitor</span>
                </div>
                <nav className="flex flex-col gap-1 p-2">
                  {navItems.map((item) => {
                    const isActive = item.isExact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    )
                  })}
                  {user?.role === 'admin' && (
                    <>
                      <div className="h-px bg-border my-2" />
                      <Link
                        href="/users"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                          pathname === '/users'
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        }`}
                      >
                        <Users className="h-4 w-4" />
                        Users
                      </Link>
                    </>
                  )}
                </nav>
                {user && (
                  <div className="mt-auto border-t border-border p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        logout()
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/projects" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline font-semibold text-foreground">CWV Monitor</span>
          </Link>

          {isProjectScoped && (
                <div className="hidden sm:block">
                  {/*<ProjectSelector />*/}
                  </div>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.isExact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
            {user?.role === 'admin' && (
              <Link
                href="/users"
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === '/users'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <Users className="h-4 w-4" />
                Users
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
          {/* Theme Toggle */}
          <ThemeToggle />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium hover:bg-accent transition-colors">
                {user.name.charAt(0).toUpperCase()}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-muted-foreground">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
