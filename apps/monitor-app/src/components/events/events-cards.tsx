import { fetchEvents, fetchTotalStatsEvents } from '@/app/server/lib/clickhouse/repositories/custom-events-repository';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Eye, MousePointerClick, Tag, TrendingDown, TrendingUp, Zap } from 'lucide-react';

type Props = {
  totalEventData: Awaited<ReturnType<typeof fetchTotalStatsEvents>>;
  mostActiveEvent: Awaited<ReturnType<typeof fetchEvents>>[number];
};

function displayBigNumber(value: string | number) {
  if (Number.isNaN(value)) return value;
  const parsedNumber = Number(value);
  if (parsedNumber < 1000) return parsedNumber.toFixed(1).replace('.0', '');
  return `${(parsedNumber / 1000).toFixed(1).replace('.0', '')}K`;
}

export function EventsCards({ totalEventData, mostActiveEvent }: Props) {
  const isTrendingUp = totalEventData.total_conversions_prev <= totalEventData.total_conversions_cur;
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
                <span className="text-foreground text-2xl font-semibold">
                  {totalEventData.total_conversions_cur.toLocaleString()}
                </span>
                <span
                  className={cn(`text-status-good flex items-center gap-0.5 text-xs`, {
                    'text-status-poor': !isTrendingUp
                  })}
                >
                  {isTrendingUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Number(totalEventData.total_conversion_change_pct).toFixed(1)}%
                </span>
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
                <span className="text-foreground truncate text-lg font-semibold">
                  {mostActiveEvent.event_name || '—'}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {displayBigNumber(mostActiveEvent.records_count)}
                </span>
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
              <div className="text-foreground text-2xl font-semibold">{totalEventData.total_events_cur}</div>
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
                {displayBigNumber(totalEventData.total_views_cur)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
