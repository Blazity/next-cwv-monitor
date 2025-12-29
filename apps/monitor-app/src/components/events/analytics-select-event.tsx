'use client';

import { EventDisplaySettingsSchema } from '@/app/server/lib/clickhouse/schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseAsStringEnum, useQueryState } from 'nuqs';

type Props = {
  events: [string, ...string[]];
  eventDisplaySettings: EventDisplaySettingsSchema;
};

export function AnalyticsSelectEvent({ events, eventDisplaySettings }: Props) {
  const [selectedEvent, setSelectedEvent] = useQueryState(
    'event',
    parseAsStringEnum(events).withDefault(events[0]).withOptions({ shallow: false })
  );

  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground text-sm">Viewing:</span>
      <Select value={selectedEvent} onValueChange={setSelectedEvent}>
        <SelectTrigger className="bg-card border-border w-48 capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {events.map((event) => {
            const eventName = eventDisplaySettings?.[event].customName || event.replaceAll('_', ' ');
            return (
              <SelectItem className="capitalize" key={event} value={event}>
                {eventName}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
