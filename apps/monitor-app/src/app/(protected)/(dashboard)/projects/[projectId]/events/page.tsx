import {
  fetchEventsStatsData,
  fetchEvents,
  fetchTotalStatsEvents,
  fetchConversionTrend,
  fetchProjectEventNames,
} from "@/app/server/lib/clickhouse/repositories/custom-events-repository";
import { eventDisplaySettingsSchema } from "@/app/server/lib/clickhouse/schema";
import { PageHeader } from "@/components/dashboard/page-header";
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
  const { timeRange, deviceType, event = "" } = eventsSearchParamsCache.parse(await searchParams);

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
          fetchEventsStatsData({ eventName: selectedEvent, projectId, range: timeRange, deviceType }),
          fetchTotalStatsEvents({ projectId, range: timeRange, deviceType }),
          fetchConversionTrend({ projectId, range: timeRange, eventName: selectedEvent, deviceType }),
        ])
      : [null, null, null];

  return (
    <div className="space-y-6">
      <PageHeader title="Events" description="Track conversions and manage custom events"></PageHeader>
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
