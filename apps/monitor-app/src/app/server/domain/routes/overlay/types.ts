import type { DeviceType } from '@/app/server/lib/device-types';

export const ROUTES_DEVICE_TYPES = ['desktop', 'mobile', 'all'] as const;
export type RoutesDeviceType = DeviceType | 'all';

export type DateRange = {
  start: Date;
  end: Date;
};

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
  | { kind: 'ok'; data: RouteEventOverlay }
  | { kind: 'project-not-found'; projectId: string };


