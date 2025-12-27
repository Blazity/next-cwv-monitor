import { fetchEventsStatsData } from '@/app/server/lib/clickhouse/repositories/custom-events-repository';
import { AnalyticsSelectEvent } from '@/components/events/analytics-select-event';
import { AnalyticsTable } from '@/components/events/analytics-table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import { TrendingDown, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Area
} from 'recharts';
import { hasAtLeast } from 'remeda';

type Props = {
  events: string[];
  eventStats: Awaited<ReturnType<typeof fetchEventsStatsData>>;
};

export function AnalyticsTab({ events, eventStats }: Props) {
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
            {/* <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="conversionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)' }}
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)' }}
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                  width={50}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || payload.length === 0) return null;
                    const point = payload[0].payload as {
                      date: string;
                      rate: number;
                      events: number;
                      views: number;
                    };
                    return (
                      <div className="bg-popover border-border rounded-lg border p-3 shadow-lg">
                        <p className="text-muted-foreground mb-2 text-sm">{point.date}</p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-foreground text-sm">Conversion Rate</span>
                            <span className="text-foreground font-mono text-sm font-medium">
                              {point.rate.toFixed(2)}%
                            </span>
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {point.events.toLocaleString()} events / {point.views.toLocaleString()} views
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#conversionGradient)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: 'var(--chart-1)',
                    stroke: 'var(--background)',
                    strokeWidth: 2
                  }}
                />
              </AreaChart>
            </ResponsiveContainer> */}
          </div>
        </CardContent>
      </Card>

      {/* Conversion by Route */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>
            Conversion by Route
            <span className="text-muted-foreground ml-2 font-normal">
              {/* — {visibleEvents.find((e) => e.id === selectedEvent)?.displayName} */}
            </span>
          </CardTitle>
          <CardDescription>
            {/* How "{visibleEvents.find((e) => e.id === selectedEvent)?.displayName}" converts across routes where it's */}
            tracked
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <AnalyticsTable eventStats={eventStats} />
          </div>
        </CardContent>
        <CardFooter className="border-border border-t pt-4">
          <div className="flex w-full items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {/* Tracked on {routeEventData.length} route{routeEventData.length === 1 ? '' : 's'} */}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                {/* Total: <span className="text-foreground font-medium">{totalConversionsForEvent.toLocaleString()}</span>{' '} */}
                conversions
              </span>
              <span className="text-muted-foreground">
                {/* Overall rate: <span className="text-foreground font-medium">{overallRateForEvent.toFixed(2)}%</span> */}
              </span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </TabsContent>
  );
}
