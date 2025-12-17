'use client';

import type React from 'react';

import { cn } from '@/lib/utils';
import type { DeviceType } from '@/app/server/lib/device-types';
import { Monitor, Smartphone, Layers } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useQueryParam } from '@/lib/use-query-params';

const devices: { value?: DeviceType; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { value: undefined, label: 'All devices', shortLabel: 'All', icon: <Layers className="h-3.5 w-3.5" /> },
  { value: 'desktop', label: 'Desktop', shortLabel: 'Desktop', icon: <Monitor className="h-3.5 w-3.5" /> },
  { value: 'mobile', label: 'Mobile', shortLabel: 'Mobile', icon: <Smartphone className="h-3.5 w-3.5" /> }
];

export function DeviceSelector() {
  const [deviceType, setDeviceType] = useQueryParam('deviceType', '');

  const handleDeviceChange = (value: DeviceType | undefined) => {
    setDeviceType(value || null);
  };

  const selectedDevice = deviceType === '' ? undefined : (deviceType as DeviceType | undefined);

  return (
    <TooltipProvider>
      <div
        className="bg-muted flex items-center gap-0.5 rounded-lg p-0.5 sm:gap-1 sm:p-1"
        role="tablist"
        aria-label="Device type filter"
      >
        {devices.map((device) => (
          <Tooltip key={device.value ?? 'all'}>
            <TooltipTrigger asChild>
              <button
                role="tab"
                aria-selected={selectedDevice === device.value}
                onClick={() => handleDeviceChange(device.value)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 sm:text-sm',
                  selectedDevice === device.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
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
