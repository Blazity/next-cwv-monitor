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
import { DateRangeWithPrev } from "@/app/server/domain/dashboard/overview/types";

export class EventsDashboardService {
  async getDashboardData(query: GetEventsDashboardQuery): Promise<GetEventsDashboardResult> {
    const project = await getProjectById(query.projectId);
    if (!project) return { kind: "project-not-found", projectId: query.projectId };

    const dateRange: DateRangeWithPrev = (query.customStart && query.customEnd)
      ? { start: query.customStart, end: query.customEnd, prevStart: new Date(query.customStart.getTime() - (query.customEnd.getTime() - query.customStart.getTime())) }
      : timeRangeToDateRange(query.range);

    const [names, totalStats, activity] = await Promise.all([
      fetchProjectEventNames({ projectId: query.projectId }),
      fetchTotalStatsEvents({ projectId: query.projectId, range: dateRange, deviceType: query.deviceType }),
      fetchEvents({ projectId: query.projectId, range: dateRange, deviceType: query.deviceType }),
    ]);

    const out = eventDisplaySettingsSchema(project.events_display_settings);
    const displaySettings = out instanceof ArkErrors ? null : out;
    const eventNames = names.map((v) => v.event_name);

    const defaultEvent = eventNames.find((e) => !displaySettings?.[e]?.isHidden) || eventNames[0];
    const queriedEvents = (query.selectedEvents || [defaultEvent]).filter(
      (e) => !displaySettings?.[e]?.isHidden
    );

    const mostActiveEvent = activity.find((e) => {
      if (!e.event_name) return false;
      return displaySettings?.[e.event_name] ? !displaySettings[e.event_name].isHidden : true;
    });

    const hasEvents = queriedEvents.length > 0;
    const [overlayRows, eventStats, metricSeriesRows] = await Promise.all([
      hasEvents 
        ? fetchMultiEventOverlaySeries({
            projectId: query.projectId,
            range: dateRange,
            deviceType: query.deviceType,
            eventNames: queriedEvents,
            interval: query.interval
          })
        : Promise.resolve([]), 
      hasEvents
        ? fetchEventsStatsData({
            projectId: query.projectId,
            range: dateRange,
            eventNames: queriedEvents,
            deviceType: query.deviceType,
          })
        : Promise.resolve([]), 
      fetchAllMetricsSeries({
        projectId: query.projectId,
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        interval: query.interval,
        deviceType: query.deviceType
      }),
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
          displaySettings
        }),
        eventStats,
      },
    };
  }
}
