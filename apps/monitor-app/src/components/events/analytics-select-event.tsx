'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseAsStringEnum, useQueryState } from 'nuqs';

type Props = {
  events: [string, ...string[]];
};

export function AnalyticsSelectEvent({ events }: Props) {
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
          {events.map((event) => (
            <SelectItem className="capitalize" key={event} value={event}>
              {event.replaceAll('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
