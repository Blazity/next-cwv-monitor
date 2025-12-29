import {
  fetchEventsStatsData,
  fetchEvents,
  fetchTotalStatsEvents,
  fetchConversionTrend,
  fetchProjectEventNames
} from '@/app/server/lib/clickhouse/repositories/custom-events-repository';
import { eventDisplaySettingsSchema } from '@/app/server/lib/clickhouse/schema';
import { TimeRangeSelector } from '@/components/dashboard/time-range-selector';
import { EventsCards } from '@/components/events/events-cards';
import { EventsTabs } from '@/components/events/events-tabs';
import { getAuthorizedSession } from '@/lib/auth-utils';
import { getCachedProject } from '@/lib/cache';
import { eventsSearchParamsSchema } from '@/lib/search-params';
import { notFound } from 'next/navigation';
import { entries, filter } from 'remeda';

async function EventsPage({ params, searchParams }: PageProps<'/projects/[projectId]/events'>) {
  await getAuthorizedSession();
  const { projectId } = await params;
  const { timeRange, event } = eventsSearchParamsSchema.parse(await searchParams);

  const [[mostActiveEvent], names, project] = await Promise.all([
    fetchEvents({ projectId, range: timeRange, limit: 1 }),
    fetchProjectEventNames({ projectId }),
    getCachedProject(projectId)
  ]);

  if (!project) {
    notFound();
  }
  const eventDisplaySettings = eventDisplaySettingsSchema.parse(project.events_display_settings);
  const eventNames = names.map((v) => v.event_name);
  const selectedEvent = event || eventNames[0];

  const excludedEventNames = filter(entries(eventDisplaySettings ?? {}), ([, value]) => value.isHidden === true).map(
    ([key]) => key
  );
  const [events, eventsStats, chartData] = await Promise.all([
    fetchEventsStatsData({
      eventName: selectedEvent,
      projectId,
      range: '90d'
    }),
    fetchTotalStatsEvents({ projectId, range: timeRange }),
    fetchConversionTrend({ projectId, range: timeRange, excludedEventNames })
  ]);

  return (
    <>
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
    </>
  );
}

export default EventsPage;
