"use client";
import { updateProjectAction } from "@/app/server/actions/project/update-project";
import { EventDisplaySettings } from "@/app/server/lib/clickhouse/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { capitalize, cn } from "@/lib/utils";
import { arktypeResolver } from "@hookform/resolvers/arktype";
import { type } from "arktype";
import { BarChart3, Check, Eye, EyeOff, Info, Pencil, Search, X } from "lucide-react";
import { useOptimisticAction } from "next-safe-action/hooks";
import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { CustomInput } from "@/components/custom-input";
import { toast } from "sonner";
import { UpdateProjectInput } from "@/app/server/domain/projects/update/types";

const renameSchema = type({ customName: "string>0" });
type RenameInput = typeof renameSchema.infer;

type Props = {
  eventsDisplaySettings: EventDisplaySettings;
  eventNames: string[];
  projectId: string;
};

export function ManageTab({ eventsDisplaySettings: initialSettings, eventNames, projectId }: Props) {
  const [searchQuery, setSearchQuery] = useQueryState("event_name");

  const { execute, optimisticState, isPending } = useOptimisticAction(updateProjectAction, {
    currentState: initialSettings ?? {},
    updateFn: (state, input) => ({
      ...state,
      ...input.eventSettings,
    }),
    onSuccess: () => toast.success("Event updated successfully"),
    onError: () => toast.error("Failed to update event"),
  });

  const getEventSettings = (name: string) => optimisticState[name] ?? { isHidden: false, customName: undefined };

  const filteredEvents = eventNames.filter((name) => {
    const settings = getEventSettings(name);
    const lowSearch = searchQuery?.toLowerCase();
    if (!lowSearch) return true;
    return name.toLowerCase().includes(lowSearch) || settings.customName?.toLowerCase().includes(lowSearch);
  });

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
            value={searchQuery ?? ""}
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
              {searchQuery ? `No events matching "${searchQuery}"` : "No events discovered yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event) => (
              <EventRow
                key={event}
                event={event}
                settings={getEventSettings(event)}
                projectId={projectId}
                execute={execute}
                isPending={isPending}
              />
            ))}
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

function EventRow({
  event,
  settings,
  projectId,
  execute,
  isPending,
}: {
  event: string;
  settings: { isHidden: boolean; customName?: string };
  projectId: string;
  execute: (input: UpdateProjectInput) => void;
  isPending: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<RenameInput>({
    resolver: arktypeResolver(renameSchema),
    defaultValues: {
      customName: settings.customName || capitalize(event, true),
    },
  });

  useEffect(() => {
    form.reset({
      customName: settings.customName || capitalize(event, true),
    });
  }, [settings.customName, event, form]);

  const onRenameSubmit = (data: RenameInput) => {
    execute({
      projectId,
      eventSettings: {
        [event]: {
          isHidden: settings.isHidden,
          customName: data.customName,
        },
      },
    });
    setIsEditing(false);
  };

  const toggleVisibility = () => {
    execute({
      projectId,
      eventSettings: {
        [event]: {
          isHidden: !settings.isHidden,
          customName: settings.customName,
        },
      },
    });
  };

  return (
    <div
      className={cn("border-border bg-background flex items-center justify-between rounded-lg border p-4", {
        "border-border bg-muted/30": settings.isHidden,
      })}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleVisibility}
              type="button"
              className={cn("text-status-good hover:bg-status-good/10 rounded-md p-1.5 transition-colors", {
                "text-muted-foreground hover:text-foreground hover:bg-accent": settings.isHidden,
              })}
            >
              {settings.isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>{settings.isHidden ? "Show in selectors" : "Hide from selectors"}</TooltipContent>
        </Tooltip>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <form onSubmit={form.handleSubmit(onRenameSubmit)} className="flex items-center gap-2">
              <CustomInput
                registration={form.register("customName")}
                control={form.control}
                defaultValue={settings.customName || capitalize(event, true)}
                autoFocus
                className="h-8"
                onKeyDown={(e) => e.key === "Escape" && setIsEditing(false)}
              />
              <Button size="sm" variant="ghost" type="submit" disabled={isPending} className="h-8 w-8 p-0">
                <Check className="text-status-good h-4 w-4" />
              </Button>
              <Button
                disabled={isPending}
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                className="h-8 w-8 p-0"
              >
                <X className="text-muted-foreground h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={cn("text-sm font-medium capitalize", {
                    "text-muted-foreground": settings.isHidden,
                    "text-foreground": !settings.isHidden,
                  })}
                >
                  {settings.customName || event.replaceAll("_", " ")}
                </span>
              </div>
              <span className="text-muted-foreground font-mono text-xs">{event}</span>
            </div>
          )}
        </div>
      </div>

      {!isEditing && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setIsEditing(true);
            form.setValue("customName", settings.customName || capitalize(event, true) || "");
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <Pencil className="mr-1.5 h-4 w-4" />
          Rename
        </Button>
      )}
    </div>
  );
}
