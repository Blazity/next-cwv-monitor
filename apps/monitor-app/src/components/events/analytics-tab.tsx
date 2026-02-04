import { fetchEventsStatsData } from "@/app/server/lib/clickhouse/repositories/custom-events-repository";
import { EventDisplaySettings } from "@/app/server/lib/clickhouse/schema";
import { AnalyticsTable } from "@/components/events/analytics-table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { capitalize } from "@/lib/utils";
import { sumBy } from "remeda";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { BarChart3 } from "lucide-react";
import { TimeSeriesChartProps } from "@/components/dashboard/time-series-chart";
import { TrendChartByMetric } from "@/components/dashboard/trend-chart-by-metric";
import { useMemo } from "react";

type Props = {
  eventStats: Awaited<ReturnType<typeof fetchEventsStatsData>> | null;
  chartData: TimeSeriesChartProps | null;
  selectedEvents: string[];
  eventDisplaySettings: EventDisplaySettings;
};

export function AnalyticsTab({ eventStats, chartData, selectedEvents, eventDisplaySettings }: Props) {
  const hasStats = Array.isArray(eventStats) && eventStats.length > 0;

  const visibleOverlays = useMemo(() => {
    return chartData?.overlays?.filter(ov => !eventDisplaySettings?.[ov.id]?.isHidden) || [];
  }, [chartData?.overlays, eventDisplaySettings]);

  const hasSelectedEvents = selectedEvents.length > 0;

  const selectedEventName = selectedEvents.map((id) => capitalize(eventDisplaySettings?.[id]?.customName || id.replaceAll("_", " "), true)).join(", ");
  
  const totalConversionsForEvent = hasStats ? sumBy(eventStats, (v) => v.conversions_cur) : 0;

  const overallRateForEvent = hasStats
  ? (sumBy(eventStats, s => s.conversions_cur) / sumBy(eventStats, s => s.views_cur)) * 100
  : null;

  return (
    <>
      {chartData ? (
        <TrendChartByMetric
          title="Conversion Trend"
          description="Event conversion rate over time"
          dateRange={chartData.dateRange}
          interval={chartData.interval}
          data={chartData.data}
          multiOverlay={visibleOverlays}
        />
      ) : (
        <div className="text-muted-foreground flex h-full items-center justify-center text-sm italic">
          No trend data available for the selected period
        </div>
      )}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>
            Conversion by Route
            <span className="text-muted-foreground ml-2 font-normal">{selectedEventName}</span>
          </CardTitle>
          <CardDescription>{hasSelectedEvents 
      ? `How "${selectedEventName}" converts across routes where it's tracked`
      : "How events convert across routes"}</CardDescription>
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
                <EmptyTitle>{hasSelectedEvents ? "No data for this event" : "No events selected"}</EmptyTitle>
                <EmptyDescription>
                  {hasSelectedEvents && `We haven't tracked any "${selectedEventName}" conversions in the selected time range.`}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
        {hasStats && (
          <CardFooter className="border-border border-t pt-4">
            <div className="flex w-full items-center justify-between gap-4 text-sm">
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
