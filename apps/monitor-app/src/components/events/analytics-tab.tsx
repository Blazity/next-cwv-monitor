import {
  fetchConversionTrend,
  fetchEventsStatsData
} from '@/app/server/lib/clickhouse/repositories/custom-events-repository';
import { AnalyticsChart } from '@/components/events/analytics-chart';
import { AnalyticsSelectEvent } from '@/components/events/analytics-select-event';
import { AnalyticsTable } from '@/components/events/analytics-table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';

import { hasAtLeast, sumBy } from 'remeda';

type Props = {
  events: string[];
  eventStats: Awaited<ReturnType<typeof fetchEventsStatsData>>;
  chartData: Awaited<ReturnType<typeof fetchConversionTrend>>;
  selectedEvent: string;
};

export function AnalyticsTab({ events, eventStats, chartData, selectedEvent }: Props) {
  const totalConversionsForEvent = sumBy(eventStats, (v) => Number(v.conversions_cur));
  const overallRateForEvent = sumBy(eventStats, (v) => Number(v.conversion_rate)) / eventStats.length;

  return (
    <TabsContent value="analytics" className="space-y-6">
      {hasAtLeast(events, 1) && <AnalyticsSelectEvent events={events} />}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Conversion Trend</CardTitle>
          <CardDescription>Event conversion rate over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <AnalyticsChart chartData={chartData} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>
            Conversion by Route
            <span className="text-muted-foreground ml-2 font-normal">{selectedEvent}</span>
          </CardTitle>
          <CardDescription>How "{selectedEvent}" converts across routes where it's tracked</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <AnalyticsTable eventStats={eventStats} />
          </div>
        </CardContent>
        <CardFooter className="border-border border-t pt-4">
          <div className="flex w-full items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Tracked on {eventStats.length} route{eventStats.length === 1 ? '' : 's'}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                Total: <span className="text-foreground font-medium">{totalConversionsForEvent.toLocaleString()}</span>{' '}
                conversions
              </span>
              <span className="text-muted-foreground">
                Overall rate: <span className="text-foreground font-medium">{overallRateForEvent.toFixed(2)}%</span>
              </span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </TabsContent>
  );
}
