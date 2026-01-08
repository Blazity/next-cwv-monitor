import { DateRange } from "@/app/server/domain/dashboard/overview/types";
import { RoutesDeviceType } from "@/app/server/domain/routes/list/types";

export type GetRouteEventOverlayQuery = {
  projectId: string;
  route: string;
  range: DateRange;
  deviceType: RoutesDeviceType;
  eventName: string;
};

export type RouteEventOverlayPoint = {
  date: string;
  views: number;
  conversions: number;
  conversionRatePct: number | null;
};

export type RouteEventOverlay = {
  eventName: string;
  series: RouteEventOverlayPoint[];
  totals: {
    views: number;
    conversions: number;
    conversionRatePct: number | null;
  };
};

export type GetRouteEventOverlayResult =
  | { kind: "ok"; data: RouteEventOverlay }
  | { kind: "project-not-found"; projectId: string };
