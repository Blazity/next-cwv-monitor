import { Route, TrendingDown, Calendar, Settings, LayoutDashboard } from "lucide-react";

export function getNavItems(projectId: string | undefined) {
  if (!projectId) {
    return [{ href: "/projects", label: "Projects", icon: LayoutDashboard, isExact: true }];
  }
  return [
    { href: `/projects/${projectId}`, label: "Overview", icon: LayoutDashboard, isExact: true },
    { href: `/projects/${projectId}/routes`, label: "Routes", icon: Route },
    { href: `/projects/${projectId}/regressions`, label: "Regressions", icon: TrendingDown },
    { href: `/projects/${projectId}/events`, label: "Events", icon: Calendar },
    { href: `/projects/${projectId}/settings`, label: "Settings", icon: Settings }
  ];
}

export type NavItem = ReturnType<typeof getNavItems>[number];
