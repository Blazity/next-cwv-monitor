import { fetchEvents, fetchTotalStatsEvents } from "@/app/server/lib/clickhouse/repositories/custom-events-repository";
import { EventDisplaySettings } from "@/app/server/lib/clickhouse/schema";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Eye, MousePointerClick, Tag, TrendingDown, TrendingUp, Zap } from "lucide-react";

type Props = {
  totalEventData: Awaited<ReturnType<typeof fetchTotalStatsEvents>> | null;
  mostActiveEvent: Awaited<ReturnType<typeof fetchEvents>>[number];
  eventDisplaySettings: EventDisplaySettings;
};

function displayBigNumber(value: string | number) {
  if (Number.isNaN(value)) return value;
  const parsedNumber = Number(value);
  if (parsedNumber < 1000) return parsedNumber.toFixed(1).replace(".0", "");
  return `${(parsedNumber / 1000).toFixed(1).replace(".0", "")}K`;
}

export function EventsCards({ totalEventData, mostActiveEvent, eventDisplaySettings }: Props) {
  const totalCur = Number(totalEventData?.total_conversions_cur ?? 0);
  const totalPrev = Number(totalEventData?.total_conversions_prev ?? 0);
  const changePct = Number(totalEventData?.total_conversion_change_pct ?? 0);

  const isTrendingUp = totalPrev <= totalCur;
  const mostActiveName = mostActiveEvent?.event_name;
  const settings = mostActiveName ? eventDisplaySettings?.[mostActiveName] : null;
  const eventName = mostActiveName ? settings?.customName || mostActiveName : "-";
  return (
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
                <span className="text-foreground text-2xl font-semibold">{totalCur.toLocaleString()}</span>
                {totalPrev > 0 && (
                  <span
                    className={cn(`text-status-good flex items-center gap-0.5 text-xs`, {
                      "text-status-poor": !isTrendingUp,
                    })}
                  >
                    {isTrendingUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Number(changePct).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-status-needs-improvement/15 flex h-10 w-10 items-center justify-center rounded-lg">
              <Zap className="text-status-needs-improvement h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-muted-foreground text-sm">Most Active Event</div>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn("text-foreground truncate text-lg font-semibold capitalize", {
                    "text-muted-foreground font-normal italic": !mostActiveName,
                  })}
                >
                  {eventName.replaceAll("_", " ")}
                </span>
                {mostActiveName && (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {displayBigNumber(mostActiveEvent.records_count)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
              <Tag className="text-muted-foreground h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-muted-foreground text-sm">Tracked Events</div>
              <div className="text-foreground text-2xl font-semibold">{totalEventData?.total_events_cur ?? 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
              <Eye className="text-muted-foreground h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-muted-foreground text-sm">Total Views</div>
              <div className="text-foreground text-2xl font-semibold">
                {displayBigNumber(totalEventData?.total_views_cur ?? 0)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
