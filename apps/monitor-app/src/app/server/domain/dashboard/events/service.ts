import {
  fetchProjectEventNames,
  fetchTotalStatsEvents,
  fetchEvents,
  fetchEventsStatsData,
  fetchMultiEventOverlaySeries,
} from "@/app/server/lib/clickhouse/repositories/custom-events-repository";
import { getProjectById } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { eventDisplaySettingsSchema } from "@/app/server/lib/clickhouse/schema";
import { timeRangeToDateRange } from "@/lib/utils";
import { ArkErrors } from "arktype";
import { fetchAllMetricsSeries } from "@/app/server/lib/clickhouse/repositories/dashboard-overview-repository";
import { GetEventsDashboardQuery, GetEventsDashboardResult } from "@/app/server/domain/dashboard/events/types";
import { mapToTimeSeriesChartProps } from "@/app/server/domain/dashboard/events/mappers";

export class EventsDashboardService {
  async getDashboardData(query: GetEventsDashboardQuery): Promise<GetEventsDashboardResult> {
    const project = await getProjectById(query.projectId);
    if (!project) return { kind: "project-not-found", projectId: query.projectId };

    const [names, totalStats, activity] = await Promise.all([
      fetchProjectEventNames({ projectId: query.projectId }),
      fetchTotalStatsEvents({ projectId: query.projectId, range: query.range, deviceType: query.deviceType }),
      fetchEvents({ projectId: query.projectId, range: query.range }),
    ]);

    const out = eventDisplaySettingsSchema(project.events_display_settings);
    const displaySettings = out instanceof ArkErrors ? null : out;
    const eventNames = names.map((v) => v.event_name);

    const defaultEvent = eventNames.find((e) => !displaySettings?.[e]?.isHidden) || eventNames[0];
    const queriedEvents = query.selectedEvents || [defaultEvent];

    const mostActiveEvent = activity.find((e) => {
      if (!e?.event_name) return false;
      return displaySettings?.[e.event_name] ? !displaySettings[e.event_name].isHidden : true;
    });

    const dateRange = timeRangeToDateRange(query.range);
    const toSeriesFilterString =
      query.interval === "hour"
        ? (date: Date) => date.toISOString()
        : (date: Date) => date.toISOString().slice(0, 10);

    const seriesFilters = {
      projectId: query.projectId,
      start: toSeriesFilterString(dateRange.start),
      end: toSeriesFilterString(dateRange.end),
      interval: query.interval,
      deviceType: query.deviceType,
    };

    const [overlayRows, eventStats, metricSeriesRows] = await Promise.all([
      fetchMultiEventOverlaySeries({
        projectId: query.projectId,
        range: dateRange,
        deviceType: query.deviceType,
        eventNames: queriedEvents,
        interval: query.interval
      }),
      fetchEventsStatsData({
        projectId: query.projectId,
        range: query.range,
        eventNames: queriedEvents,
        deviceType: query.deviceType,
      }),
      fetchAllMetricsSeries(seriesFilters),
    ]);

    return {
      kind: "ok",
      data: {
        eventNames,
        displaySettings,
        totalStats,
        mostActiveEvent: mostActiveEvent ?? null,
        queriedEvents,
        chartData: mapToTimeSeriesChartProps({
          seriesRows: metricSeriesRows,
          overlayRows,
          eventNames: queriedEvents,
          metric: query.metric,
          dateRange,
          interval: query.interval,
        }),
        eventStats,
      },
    };
  }
}
