import { Route } from "next";
import { Route as RouteIcon, TrendingDown, Calendar, Settings, LayoutDashboard } from "lucide-react";

export function getNavItems(
  projectId: string | undefined,
): { href: Route<`/projects/${string}`>; label: string; icon: React.ElementType; isExact?: boolean }[] {
  if (!projectId) {
    return [{ href: "/projects", label: "Projects", icon: LayoutDashboard, isExact: true }] as const;
  }
  return [
    { href: `/projects/${projectId}`, label: "Overview", icon: LayoutDashboard, isExact: true },
    { href: `/projects/${projectId}/routes`, label: "Routes", icon: RouteIcon },
    { href: `/projects/${projectId}/regressions`, label: "Regressions", icon: TrendingDown },
    { href: `/projects/${projectId}/events`, label: "Events", icon: Calendar },
    { href: `/projects/${projectId}/settings`, label: "Settings", icon: Settings },
  ] as const;
}

export type NavItem = ReturnType<typeof getNavItems>[number];
