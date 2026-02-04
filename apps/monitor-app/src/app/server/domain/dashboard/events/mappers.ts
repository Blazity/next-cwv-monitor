import {
  DailySeriesPoint,
  DateRange,
  getEffectiveInterval,
  IntervalKey,
  MetricName,
  PAGE_VIEW_EVENT_NAME,
} from "@/app/server/domain/dashboard/overview/types";
import { MultiEventOverlayRow } from "@/app/server/lib/clickhouse/repositories/custom-events-repository";
import {
  TimeSeriesChartProps,
  TimeSeriesOverlay,
  TimeSeriesOverlayPoint,
} from "@/components/dashboard/time-series-chart";
import { eventsSearchParamsCache } from "@/lib/search-params";
import { toQuantileSummary } from "@/app/server/lib/quantiles";
import { getRatingForValue } from "@/app/server/lib/cwv-thresholds";
import { MetricSeriesRow } from "@/app/server/lib/clickhouse/repositories/dashboard-overview-repository";
import { GetEventsDashboardQuery } from "@/app/server/domain/dashboard/events/types";
import { EventDisplaySettings } from "@/app/server/lib/clickhouse/schema";
import { capitalize } from "@/lib/utils";

export type BuildEventsDashboardQueryInput = {
  projectId: string;
} & ReturnType<typeof eventsSearchParamsCache.all>;

export function buildEventsDashboardQuery(input: BuildEventsDashboardQueryInput): GetEventsDashboardQuery {
  const interval = getEffectiveInterval(input.interval, input.timeRange);

  return {
    projectId: input.projectId,
    range: input.timeRange,
    metric: input.metric,
    deviceType: input.deviceType,
    selectedEvents: input.events,
    interval,
  };
}

function mapOverlaySeries(
  rows: MultiEventOverlayRow[], 
  eventNames: string[], 
  displaySettings: EventDisplaySettings
): TimeSeriesOverlay[] {
  const eventsMap: Record<string, TimeSeriesOverlayPoint[]> = {};
  
  for (const name of eventNames) {
    if (name !== PAGE_VIEW_EVENT_NAME) {
      eventsMap[name] = [];
    }
  }

  for (const row of rows) {
    if (row.event_name === PAGE_VIEW_EVENT_NAME) continue;
    if (row.event_name in eventsMap) {
      const views = Number(row.views || 0);
      const conversions = Number(row.conversions || 0);

      eventsMap[row.event_name].push({
        date: row.event_date,
        views,
        conversions,
        conversionRatePct: views > 0 ? (conversions / views) * 100 : 0,
      });
    }
  }

  return Object.entries(eventsMap).map(([id, series]) => {
    const customName = displaySettings?.[id]?.customName;
    const label = capitalize(customName || id, true)!;
    return {
      id,
      label,
      series,
    };
  });
}

type MapToTimeSeriesChartPropsInput = {
  seriesRows: MetricSeriesRow[];
  overlayRows: MultiEventOverlayRow[];
  eventNames: string[];
  metric: MetricName;
  dateRange: DateRange;
  interval: IntervalKey;
  displaySettings: EventDisplaySettings
};

export function mapToTimeSeriesChartProps({
  seriesRows,
  overlayRows,
  eventNames,
  metric,
  dateRange,
  interval,
  displaySettings
}: MapToTimeSeriesChartPropsInput): TimeSeriesChartProps {
  const multiOverlay = mapOverlaySeries(overlayRows, eventNames, displaySettings);
  const filteredRows = seriesRows.filter((row) => row.metric_name === metric);

  const timeSeries: DailySeriesPoint[] = filteredRows.map((row) => {
    const quantiles = toQuantileSummary(row.percentiles);
    const p75 = quantiles?.p75;
    const status = typeof p75 === "number" ? getRatingForValue(metric, p75) : null;

    return {
      date: row.period,
      sampleSize: Number(row.sample_size || 0),
      quantiles,
      status,
    };
  });

  return {
    data: timeSeries,
    metric,
    overlays: multiOverlay,
    dateRange,
    interval,
  };
}
