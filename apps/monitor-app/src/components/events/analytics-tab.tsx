import {
  fetchConversionTrend,
  fetchEventsStatsData,
} from "@/app/server/lib/clickhouse/repositories/custom-events-repository";
import { EventDisplaySettings } from "@/app/server/lib/clickhouse/schema";
import { AnalyticsChart } from "@/components/events/analytics-chart";
import { AnalyticsTable } from "@/components/events/analytics-table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { capitalize } from "@/lib/utils";

import { sumBy } from "remeda";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { BarChart3 } from "lucide-react";

type Props = {
  eventStats: Awaited<ReturnType<typeof fetchEventsStatsData>> | null;
  chartData: Awaited<ReturnType<typeof fetchConversionTrend>> | null;
  selectedEvent: string | null;
  eventDisplaySettings: EventDisplaySettings;
};

export function AnalyticsTab({ eventStats, chartData, selectedEvent, eventDisplaySettings }: Props) {
  const hasStats = Array.isArray(eventStats) && eventStats.length > 0;
  const hasChartData = Array.isArray(chartData) && chartData.length > 0;

  if (!selectedEvent || selectedEvent && eventDisplaySettings?.[selectedEvent]?.isHidden) {
    return (
      <Empty className="border-2 border-dashed py-20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BarChart3 />
          </EmptyMedia>
          <EmptyTitle>No events found</EmptyTitle>
          <EmptyDescription>Start sending custom events to your project to see analytics here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const selectedEventName = capitalize(
    eventDisplaySettings?.[selectedEvent]?.customName || selectedEvent.replaceAll("_", " "),
    true,
  );

  const totalConversionsForEvent = hasStats ? sumBy(eventStats, (v) => v.conversions_cur) : 0;

  const overallRateForEvent = hasStats
    ? (() => {
        const rates = eventStats.map((v) => v.conversion_rate).filter((v): v is number => v !== null);
        if (rates.length === 0) return null;
        return rates.reduce((sum, v) => sum + v, 0) / rates.length;
      })()
    : null;

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Conversion Trend</CardTitle>
          <CardDescription>Event conversion rate over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {hasChartData ? (
              <AnalyticsChart chartData={chartData} />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm italic">
                No trend data available for the selected period
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>
            Conversion by Route
            <span className="text-muted-foreground ml-2 font-normal">{selectedEventName}</span>
          </CardTitle>
          <CardDescription>How "{selectedEventName}" converts across routes where it's tracked</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {hasStats ? (
            <div className="overflow-x-auto">
              <AnalyticsTable eventStats={eventStats} />
            </div>
          ) : (
            <Empty className="border-none bg-transparent py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BarChart3 className="text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No data for this event</EmptyTitle>
                <EmptyDescription>
                  We haven't tracked any "{selectedEventName}" conversions in the selected time range.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
        {hasStats && (
          <CardFooter className="border-border border-t pt-4">
            <div className="flex w-full items-center justify-between text-sm gap-4">
              <span className="text-muted-foreground">
                Tracked on {eventStats.length} route{eventStats.length === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  Total:{" "}
                  <span className="text-foreground font-medium">{totalConversionsForEvent.toLocaleString()}</span>{" "}
                  conversions
                </span>
                <span className="text-muted-foreground">
                  Overall rate:{" "}
                  <span className="text-foreground font-medium">
                    {overallRateForEvent === null ? "—" : `${overallRateForEvent.toFixed(2)}%`}
                  </span>
                </span>
              </div>
            </div>
          </CardFooter>
        )}
      </Card>
    </>
  );
}
