'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DeviceSelector } from '@/components/dashboard/device-selector';
import { TimeRangeSelector } from './time-range-selector';

type PageHeaderProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  showFilters?: boolean;
};

export function PageHeader({ title, description, children, showFilters = true }: PageHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting);
        if (!hasMounted) setHasMounted(true);
      },
      { threshold: 0, rootMargin: '-56px 0px 0px 0px' }
    );

    observer.observe(header);
    return () => observer.disconnect();
  }, [hasMounted]);

  return (
    <>
      <div ref={headerRef} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-2xl font-semibold">{title}</h1>
            {children}
          </div>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
        {showFilters && (
          <div className="shrink-0">
            <div className="flex items-center gap-2">
              <DeviceSelector />
              <TimeRangeSelector />
            </div>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="pointer-events-none sticky top-14 z-40 -mx-3 overflow-hidden sm:-mx-4 lg:-mx-6">
          <div
            className={cn(
              'bg-background/95 border-border pointer-events-auto border-b backdrop-blur',
              hasMounted ? 'transition-transform duration-300' : '',
              showStickyBar ? 'translate-y-0' : '-translate-y-full',
              !hasMounted && 'invisible'
            )}
          >
            <div className="px-3 py-3 sm:px-4 lg:px-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-foreground truncate text-base font-semibold">{title}</h2>
                <div className="flex items-center gap-2">
                  <DeviceSelector />
                  <TimeRangeSelector />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
