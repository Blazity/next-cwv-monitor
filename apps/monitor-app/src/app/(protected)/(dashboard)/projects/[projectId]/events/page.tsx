import {
  fetchEventsStatsData,
  fetchEvents,
  fetchTotalStatsEvents,
  fetchConversionTrend,
  fetchProjectEventNames
} from '@/app/server/lib/clickhouse/repositories/custom-events-repository';
import { eventDisplaySettingsSchema } from '@/app/server/lib/clickhouse/schema';
import { TimeRangeSelector } from '@/components/dashboard/time-range-selector';
import { AnalyticsTab } from '@/components/events/analytics-tab';
import { EventsCards } from '@/components/events/events-cards';
import { ManageTab } from '@/components/events/manage-tab';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getAuthorizedSession } from '@/lib/auth-utils';
import { getCachedProject } from '@/lib/cache';
import { eventsSearchParamsSchema } from '@/lib/search-params';
import { BarChart3, Settings2 } from 'lucide-react';
import { notFound } from 'next/navigation';

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

  const [events, eventsStats, chartData] = await Promise.all([
    fetchEventsStatsData({ eventName: selectedEvent, projectId, range: '90d' }),
    fetchTotalStatsEvents({ projectId, range: timeRange }),
    fetchConversionTrend({ projectId, range: timeRange })
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
        <EventsCards mostActiveEvent={mostActiveEvent} totalEventData={eventsStats} />
        <TooltipProvider>
          <Tabs defaultValue="analytics" className="space-y-6">
            <TabsList className="bg-muted">
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="manage" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Manage Events
              </TabsTrigger>
            </TabsList>
            <AnalyticsTab selectedEvent={selectedEvent} chartData={chartData} eventStats={events} events={eventNames} />
            <ManageTab eventNames={eventNames} eventsDisplaySettings={eventDisplaySettings} projectId={projectId} />
          </Tabs>
        </TooltipProvider>
      </div>
    </>
  );
}

export default EventsPage;
