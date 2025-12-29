'use client';
import { updateProjectEventsSettings } from '@/app/server/actions/project/update-project';
import { EventDisplaySettingsSchema } from '@/app/server/lib/clickhouse/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { assertNever, capitalize, cn } from '@/lib/utils';
import { BarChart3, Check, Eye, EyeOff, Info, Pencil, Search, X } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useOptimistic, useReducer, useRef, useTransition } from 'react';

type Props = {
  eventsDisplaySettings: EventDisplaySettingsSchema;
  eventNames: string[];
  projectId: string;
};

type Actions =
  | {
      type: 'cancel-edit' | 'save-edit';
      eventName?: never;
    }
  | {
      type: 'set-edit-name';
      eventName: string;
    };

const reducer = (_: string | null | undefined, action: Actions) => {
  switch (action.type) {
    case 'cancel-edit':
    case 'save-edit': {
      return null;
    }
    case 'set-edit-name': {
      return action.eventName;
    }
    default: {
      assertNever(action);
    }
  }
};

export function ManageTab({ eventsDisplaySettings: settings, eventNames, projectId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [eventsDisplaySettings, setEventDisplaySettings] = useOptimistic(settings);
  const [searchQuery, setSearchQuery] = useQueryState('event_name');
  const [editedEvent, dispatchEditEvent] = useReducer(reducer, null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const filteredEvents = eventNames.filter((eventName) => {
    if (!searchQuery) return true;
    return eventName.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase());
  });

  const handleToggleVisibility = (eventName: string) => {
    startTransition(async () => {
      const snapshot = { ...eventsDisplaySettings };
      const prevEventSettings = eventsDisplaySettings?.[eventName];
      const newSettings = {
        ...eventsDisplaySettings,
        [eventName]: {
          isHidden: prevEventSettings === undefined ? true : !prevEventSettings.isHidden,
          customName: editInputRef.current?.value || undefined
        }
      } satisfies typeof eventsDisplaySettings;
      setEventDisplaySettings(newSettings);
      try {
        await updateProjectEventsSettings({ projectId, eventSettings: newSettings });
      } catch {
        setEventDisplaySettings(snapshot);
      }
    });
  };

  const handleSaveEdit = (eventName: string) => {
    startTransition(async () => {
      const snapshot = { ...eventsDisplaySettings };
      const eventSettings = eventsDisplaySettings?.[eventName];
      const newSettings = {
        ...eventsDisplaySettings,
        [eventName]: {
          isHidden: eventSettings?.isHidden ?? false,
          customName: editInputRef.current?.value || undefined
        }
      } satisfies typeof eventsDisplaySettings;
      dispatchEditEvent({ type: 'save-edit' });
      setEventDisplaySettings(newSettings);
      try {
        await updateProjectEventsSettings({ projectId, eventSettings: newSettings });
      } catch {
        setEventDisplaySettings(snapshot);
      }
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Discovered Events</CardTitle>
          <CardDescription>Events automatically discovered from your application</CardDescription>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search events..."
            value={searchQuery ?? ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background border-border pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="text-muted-foreground mb-3 h-8 w-8" />
            <p className="text-muted-foreground text-sm">
              {searchQuery ? `No events matching "${searchQuery}"` : 'No events discovered yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event) => {
              const eventSettings = eventsDisplaySettings?.[event];
              return (
                <div
                  key={event}
                  className={cn(`border-border bg-background flex items-center justify-between rounded-lg border p-4`, {
                    'border-border bg-muted/30': eventSettings?.isHidden
                  })}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleToggleVisibility(event)}
                          type="button"
                          className={cn(`text-status-good hover:bg-status-good/10 rounded-md p-1.5 transition-colors`, {
                            'text-muted-foreground hover:text-foreground hover:bg-accent': eventSettings?.isHidden
                          })}
                        >
                          {eventSettings?.isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {eventSettings?.isHidden ? 'Show in selectors' : 'Hide from selectors'}
                      </TooltipContent>
                    </Tooltip>

                    <div className="min-w-0 flex-1">
                      {editedEvent === event ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveEdit(event);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Input
                            defaultValue={eventsDisplaySettings?.[event].customName || capitalize(event, true)}
                            ref={editInputRef}
                            className="bg-background border-border h-8"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(event);
                              if (e.key === 'Escape') dispatchEditEvent({ type: 'cancel-edit' });
                            }}
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" type="submit" className="h-8 w-8 p-0">
                            <Check className="text-status-good h-4 w-4" />
                          </Button>
                          <Button
                            disabled={isPending}
                            size="sm"
                            variant="ghost"
                            onClick={() => dispatchEditEvent({ type: 'cancel-edit' })}
                            className="h-8 w-8 p-0"
                          >
                            <X className="text-muted-foreground h-4 w-4" />
                          </Button>
                        </form>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium capitalize ${eventSettings?.isHidden ? 'text-muted-foreground' : 'text-foreground'}`}
                            >
                              {eventSettings?.customName || event.replaceAll('_', ' ')}
                            </span>
                          </div>
                          <span className="text-muted-foreground font-mono text-xs">{event}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {editedEvent !== event && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dispatchEditEvent({ eventName: event, type: 'set-edit-name' })}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Rename
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-border border-t pt-4">
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <Info className="h-4 w-4" />
          Hidden events won't appear in event selectors but data is still collected.
        </p>
      </CardFooter>
    </Card>
  );
}
