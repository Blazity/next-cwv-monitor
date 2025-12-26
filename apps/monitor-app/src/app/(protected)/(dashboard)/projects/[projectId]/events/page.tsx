import {
  fetchEventsStatsData,
  fetchTotalStatsEvents
} from '@/app/server/lib/clickhouse/repositories/custom-events-repository';
import { TimeRangeSelector } from '@/components/dashboard/time-range-selector';
import { Card, CardContent } from '@/components/ui/card';
import { MousePointerClick, TrendingDown, TrendingUp } from 'lucide-react';

async function EventsPage({ params }: PageProps<'/projects/[projectId]/events'>) {
  const { projectId } = await params;

  const events = await fetchEventsStatsData({ eventName: 'footer_nav_click', projectId, range: '90d' });
  const eventsStats = await fetchTotalStatsEvents({ projectId, range: '7d' });
  const p: number = 10;
  return (
    <>
      <div className="space-y-3">
        <pre className="border-2">{JSON.stringify(events, null, 2)}</pre>
        <pre className="border-2">{JSON.stringify(eventsStats, null, 2)}</pre>
      </div>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-foreground text-2xl font-semibold">Events</h1>
            <p className="text-muted-foreground text-sm">Track conversions and manage custom events</p>
          </div>
          <TimeRangeSelector />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/15 flex h-10 w-10 items-center justify-center rounded-lg">
                  <MousePointerClick className="text-primary h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-muted-foreground text-sm">Total Conversions</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-foreground text-2xl font-semibold">
                      TESt
                      {/* {totalConversionsForEvent.toLocaleString()} */}
                    </span>
                    <span
                      className={`flex items-center gap-0.5 text-xs ${p >= 0 ? 'text-status-good' : 'text-status-poor'}`}
                    >
                      {p >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(p).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

export default EventsPage;
