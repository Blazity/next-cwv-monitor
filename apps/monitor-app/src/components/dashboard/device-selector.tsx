"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Monitor, Smartphone, Layers } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useQueryState } from "nuqs";
import { parseAsStringEnum } from "nuqs";
import { OVERVIEW_DEVICE_TYPES } from "@/app/server/domain/dashboard/overview/types";
import type { OverviewDeviceType } from "@/app/server/domain/dashboard/overview/types";

const devices: { value: OverviewDeviceType; label: string; shortLabel: string; icon: ReactNode }[] = [
  { value: "all", label: "All devices", shortLabel: "All", icon: <Layers className="h-3.5 w-3.5" /> },
  { value: "desktop", label: "Desktop", shortLabel: "Desktop", icon: <Monitor className="h-3.5 w-3.5" /> },
  { value: "mobile", label: "Mobile", shortLabel: "Mobile", icon: <Smartphone className="h-3.5 w-3.5" /> },
];

export function DeviceSelector() {
  const [deviceType, setDeviceType] = useQueryState(
    "deviceType",
    parseAsStringEnum([...OVERVIEW_DEVICE_TYPES])
      .withDefault("all")
      .withOptions({ shallow: false }),
  );

  const handleDeviceChange = (value: OverviewDeviceType) => {
    void setDeviceType(value);
  };

  return (
    <TooltipProvider>
      <div
        className="bg-muted flex items-center gap-0.5 rounded-lg p-0.5 sm:gap-1 sm:p-1"
        role="tablist"
        aria-label="Device type filter"
      >
        {devices.map((device) => (
          <Tooltip key={device.value}>
            <TooltipTrigger asChild>
              <button
                role="tab"
                type="button"
                aria-selected={deviceType === device.value}
                onClick={() => handleDeviceChange(device.value)}
                className={cn(
                  "text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 sm:text-sm",
                  { "bg-background text-foreground shadow-sm": deviceType === device.value },
                )}
              >
                {device.icon}
                <span className="hidden sm:inline">{device.shortLabel}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="sm:hidden">
              {device.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
