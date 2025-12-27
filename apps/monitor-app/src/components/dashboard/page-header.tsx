"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DeviceSelector } from "@/components/dashboard/device-selector";
import { TimeRangeSelector } from "@/components/dashboard/time-range-selector";

type PageHeaderProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  showFilters?: boolean;
};

export function PageHeader({ title, description, children, showFilters = true }: PageHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting);
      },
      // Account for the fixed navbar (`h-14`) so the sticky bar doesn't overlap it.
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" },
    );

    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {showFilters && (
        <div className="pointer-events-none sticky top-14 z-40 -mx-3 h-px sm:-mx-4 lg:-mx-6">
          <div className="absolute left-0 right-0 top-0 overflow-hidden">
            <div
              className={cn(
                "bg-background/95 border-border border-b backdrop-blur will-change-transform",
                "pointer-events-auto transition-transform duration-300 ease-out",
                showStickyBar ? "translate-y-0 shadow-sm" : "-translate-y-[110%] ease-in",
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
        </div>
      )}

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
    </>
  );
}
