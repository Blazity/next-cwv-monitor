import {
  fetchEventsStatsData,
  fetchEvents,
  fetchTotalStatsEvents,
  fetchConversionTrend,
  fetchProjectEventNames,
} from "@/app/server/lib/clickhouse/repositories/custom-events-repository";
import { eventDisplaySettingsSchema } from "@/app/server/lib/clickhouse/schema";
import { TimeRangeSelector } from "@/components/dashboard/time-range-selector";
import { EventsCards } from "@/components/events/events-cards";
import { EventsTabs } from "@/components/events/events-tabs";
import { getAuthorizedSession } from "@/lib/auth-utils";
import { getCachedProject } from "@/lib/cache";
import { eventsSearchParamsCache } from "@/lib/search-params";
import { ArkErrors } from "arktype";
import { notFound } from "next/navigation";

async function EventsPage({ params, searchParams }: PageProps<"/projects/[projectId]/events">) {
  await getAuthorizedSession();
  const { projectId } = await params;
  // TODO: time range should handle 24h here
  const { timeRange, event = "" } = eventsSearchParamsCache.parse(await searchParams);

  const [allEvents, names, project] = await Promise.all([
    fetchEvents({ projectId, range: timeRange }),
    fetchProjectEventNames({ projectId }),
    getCachedProject(projectId),
  ]);

  if (!project) {
    notFound();
  }

  const out = eventDisplaySettingsSchema(project.events_display_settings);
  const eventDisplaySettings = out instanceof ArkErrors ? null : out;
  const eventNames = names.map((v) => v.event_name);
  const defaultEvent = eventNames.find((e) => !eventDisplaySettings?.[e]?.isHidden) || eventNames[0];
  const selectedEvent = event || defaultEvent || null;
  const hasEvents = eventNames.length > 0;

  const mostActiveEvent = allEvents.find((event) => {
    if (!event?.event_name) return false;
    const eventSettings = eventDisplaySettings?.[event.event_name];
    return eventSettings ? !eventSettings.isHidden : true;
  });

  const [events, eventsStats, chartData] =
    hasEvents && selectedEvent
      ? await Promise.all([
          fetchEventsStatsData({ eventName: selectedEvent, projectId, range: timeRange }),
          fetchTotalStatsEvents({ projectId, range: timeRange }),
          fetchConversionTrend({ projectId, range: timeRange, eventName: selectedEvent }),
        ])
      : [null, null, null];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-foreground text-2xl font-semibold">Events</h1>
          <p className="text-muted-foreground text-sm">Track conversions and manage custom events</p>
        </div>
        <TimeRangeSelector />
      </div>
      <EventsCards
        eventDisplaySettings={eventDisplaySettings}
        mostActiveEvent={mostActiveEvent}
        totalEventData={eventsStats}
      />
      <EventsTabs
        chartData={chartData}
        eventDisplaySettings={eventDisplaySettings}
        eventStats={events}
        events={eventNames}
        projectId={projectId}
        selectedEvent={selectedEvent}
      />
    </div>
  );
}

export default EventsPage;
