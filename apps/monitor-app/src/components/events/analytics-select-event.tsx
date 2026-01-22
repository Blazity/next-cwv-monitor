"use client";

import { EventDisplaySettings } from "@/app/server/lib/clickhouse/schema";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, ListFilter } from "lucide-react";
import { useQueryState } from "nuqs";
import { parseAsArrayOf, parseAsString } from "nuqs/server";

type Props = {
  events: string[];
  eventDisplaySettings: EventDisplaySettings;
};

export function AnalyticsSelectEvent({ events, eventDisplaySettings }: Props) {
  const filteredEvents = events.filter((e) => !eventDisplaySettings?.[e]?.isHidden);
  const hasEvents = filteredEvents.length > 0;

  const [selectedEvents, setSelectedEvents] = useQueryState(
    "events",
    parseAsArrayOf(parseAsString).withDefault([]).withOptions({ shallow: false }),
  );

  const toggleEvent = (event: string) => {
    const current = selectedEvents;
    const next = current.includes(event) ? current.filter((e) => e !== event) : [...current, event];

    void setSelectedEvents(next.length > 0 ? next : null);
  };

  if (!hasEvents) {
    return (
      <div className="flex items-center gap-3 opacity-50">
        <span className="text-muted-foreground text-sm">Viewing:</span>
        <span className="text-muted-foreground text-sm italic">No events</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground text-sm">Viewing:</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-card border-border h-10 min-w-[200px] justify-between px-3 font-normal"
          >
            <div className="flex items-center gap-2">
              <ListFilter className="text-muted-foreground h-4 w-4" />
              <span className="capitalize">
                {selectedEvents.length === 1
                  ? eventDisplaySettings?.[selectedEvents[0]]?.customName || selectedEvents[0].replaceAll("_", " ")
                  : `${selectedEvents.length} events selected`}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start">
          {filteredEvents.map((event) => {
            const isSelected = selectedEvents.includes(event);
            const eventName = eventDisplaySettings?.[event]?.customName || event.replaceAll("_", " ");

            return (
              <div
                key={event}
                className="hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none"
                onClick={(e) => {
                  e.preventDefault();
                  toggleEvent(event);
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleEvent(event)}
                  className="text-primary focus:ring-primary mr-3 h-4 w-4 rounded border-gray-300"
                />
                <span className="truncate capitalize">{eventName}</span>
              </div>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
