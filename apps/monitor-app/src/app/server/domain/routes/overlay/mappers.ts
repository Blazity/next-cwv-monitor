import type { GetRouteEventOverlayQuery } from "@/app/server/domain/routes/overlay/types";
import { DateRange } from "@/app/server/domain/dashboard/overview/types";
import { RoutesDeviceType } from "@/app/server/domain/routes/list/types";

const DEFAULT_RANGE_DAYS = 7;

export type BuildRouteEventOverlayQueryInput = {
  projectId: string;
  route: string;
  eventName: string;
  range?: Partial<DateRange>;
  deviceType?: RoutesDeviceType;
};

function defaultRange(): DateRange {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - DEFAULT_RANGE_DAYS);
  return { start, end };
}

function normalizeEventName(value: string): string {
  return value.trim();
}

export function buildRouteEventOverlayQuery(input: BuildRouteEventOverlayQueryInput): GetRouteEventOverlayQuery {
  const fallback = defaultRange();
  const end = input.range?.end ?? fallback.end;
  const start = input.range?.start ?? fallback.start;

  return {
    projectId: input.projectId,
    route: input.route,
    eventName: normalizeEventName(input.eventName),
    deviceType: input.deviceType ?? "all",
    range: { start, end },
  };
}
