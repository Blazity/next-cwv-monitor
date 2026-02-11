import type { GetRouteEventOverlayQuery } from "@/app/server/domain/dashboard/routes/overlay/types";
import { DateRange } from "@/app/server/domain/dashboard/overview/types";
import { DeviceFilter } from "@/app/server/lib/device-types";

const DEFAULT_RANGE_DAYS = 7;

export type BuildRouteEventOverlayQueryInput = {
  projectId: string;
  route: string;
  eventName: string;
  range?: Partial<DateRange>;
  deviceType?: DeviceFilter;
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
