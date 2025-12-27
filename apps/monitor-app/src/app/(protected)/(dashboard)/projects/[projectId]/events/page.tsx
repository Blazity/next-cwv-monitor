import {
  fetchEventsStatsData,
  fetchEvents,
  fetchTotalStatsEvents
} from '@/app/server/lib/clickhouse/repositories/custom-events-repository';
import { TimeRangeSelector } from '@/components/dashboard/time-range-selector';
import { AnalyticsTab } from '@/components/events/analytics-tab';
import { EventsCards } from '@/components/events/events-cards';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { eventsSearchParamsSchema } from '@/lib/search-params';
import { BarChart3, Settings2 } from 'lucide-react';

async function EventsPage({ params, searchParams }: PageProps<'/projects/[projectId]/events'>) {
  const { projectId } = await params;
  const { timeRange, event } = eventsSearchParamsSchema.parse(await searchParams);

  const [mostActiveEvent, ...restOfEvents] = await fetchEvents({ projectId, range: timeRange });
  const eventNames = [mostActiveEvent.event_name, ...restOfEvents.map((e) => e.event_name)];
  const events = await fetchEventsStatsData({ eventName: event ?? eventNames[0], projectId, range: '90d' });

  const eventsStats = await fetchTotalStatsEvents({ projectId, range: timeRange });

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
            <AnalyticsTab eventStats={events} events={eventNames} />
          </Tabs>
        </TooltipProvider>
      </div>
    </>
  );
}

export default EventsPage;
