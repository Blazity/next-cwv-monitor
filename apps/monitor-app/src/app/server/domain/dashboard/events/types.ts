import { IntervalKey, MetricName, TimeRangeKey } from "@/app/server/domain/dashboard/overview/types";
import { DeviceFilter } from "@/app/server/lib/device-types";
import { EventDisplaySettings } from "@/app/server/lib/clickhouse/schema";
import { TimeSeriesChartProps } from "@/components/dashboard/time-series-chart";
import {
  FetchEventResult,
  fetchEventsStatsData,
  FetchEventsTotalStatsResult,
} from "@/app/server/lib/clickhouse/repositories/custom-events-repository";

export type GetEventsDashboardQuery = {
  projectId: string;
  range: TimeRangeKey;
  customStart: Date | null;
  customEnd: Date | null;
  deviceType: DeviceFilter;
  metric: MetricName;
  selectedEvents: string[] | null;
  interval: IntervalKey;
};

export type EventsDashboardData = {
  eventNames: string[];
  displaySettings: EventDisplaySettings | null;
  totalStats: FetchEventsTotalStatsResult;
  mostActiveEvent: FetchEventResult | null;
  queriedEvents: string[];
  chartData: TimeSeriesChartProps;
  eventStats: Awaited<ReturnType<typeof fetchEventsStatsData>>;
};

export type GetEventsDashboardResult =
  | { kind: "ok"; data: EventsDashboardData }
  | { kind: "project-not-found"; projectId: string }
  | { kind: "error"; message: string };
