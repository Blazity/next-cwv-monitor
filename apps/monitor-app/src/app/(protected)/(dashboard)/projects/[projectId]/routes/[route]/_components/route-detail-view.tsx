"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Info } from "lucide-react";
import type { UrlObject } from "node:url";

import { MetricSelector } from "@/components/dashboard/metric-selector";
import { DeviceSelector } from "@/components/dashboard/device-selector";
import { TimeRangeSelector } from "@/components/dashboard/time-range-selector";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DistributionChart } from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/[route]/_components/distribution-chart";
import { InsightsCard } from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/[route]/_components/insights-card";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TimeSeriesChart, type TimeSeriesOverlay } from "@/components/dashboard/time-series-chart";
import { CORE_WEB_VITALS, OTHER_METRICS } from "@/consts/metrics";
import { cn, capitalize } from "@/lib/utils";
import { QUERY_STATE_OPTIONS, routeDetailSearchParsers, SEARCH_QUERY_OPTIONS } from "@/lib/search-params";
import { METRIC_INFO } from "@/app/server/lib/cwv-metadata";
import type { EventDisplaySettings } from "@/app/server/lib/clickhouse/schema";
import type { RouteDetail } from "@/app/server/domain/routes/detail/types";
import type { RouteEventOverlay } from "@/app/server/domain/routes/overlay/types";
import { DateRange, GranularityKey, MetricName, PERCENTILES, type Percentile } from "@/app/server/domain/dashboard/overview/types";
import { useQueryState } from "nuqs";

type RouteDetailViewProps = {
  projectId: string;
  route: string;
  routesHref: UrlObject;
  data: RouteDetail;
  visibleEvents: string[];
  eventDisplaySettings: EventDisplaySettings | null;
  selectedMetric: MetricName;
  selectedPercentile: Percentile;
  selectedEvent: string;
  dateRange: DateRange;
  granularity: GranularityKey;
  overlay: RouteEventOverlay | null;
};

const LOW_DATA_VIEWS_THRESHOLD = 1000;

function getEventLabel(eventName: string, settings: EventDisplaySettings | null): string {
  const customName = settings?.[eventName]?.customName?.trim();
  if (customName) return customName;
  return capitalize(eventName, true) || eventName;
}

export function RouteDetailView({
  data,
  eventDisplaySettings,
  routesHref,
  route,
  selectedEvent: selectedEventProp,
  selectedMetric: selectedMetricProp,
  selectedPercentile: selectedPercentileProp,
  visibleEvents,
  dateRange,
  granularity,
  overlay,
}: RouteDetailViewProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  const [selectedMetric, setSelectedMetric] = useQueryState(
    "metric",
    routeDetailSearchParsers.metric.withDefault(selectedMetricProp).withOptions(QUERY_STATE_OPTIONS),
  );
  const [selectedPercentile, setSelectedPercentile] = useQueryState(
    "percentile",
    routeDetailSearchParsers.percentile.withDefault(selectedPercentileProp).withOptions(SEARCH_QUERY_OPTIONS),
  );
  const [selectedEvent, setSelectedEvent] = useQueryState(
    "event",
    routeDetailSearchParsers.event.withDefault(selectedEventProp).withOptions(QUERY_STATE_OPTIONS),
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsStuck(!entry.isIntersecting);
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (selectedEvent && !visibleEvents.includes(selectedEvent)) {
      void setSelectedEvent("");
    }
  }, [selectedEvent, setSelectedEvent, visibleEvents]);

  const percentileLabel = selectedPercentile.toUpperCase();

  const metricsByName = useMemo(() => {
    const map = new Map<string, RouteDetail["metrics"][number]>();
    for (const metric of data.metrics) {
      map.set(metric.metricName, metric);
    }
    return map;
  }, [data.metrics]);

  const selectedMetricSummary = metricsByName.get(selectedMetric) ?? null;
  const selectedMetricSampleSize = selectedMetricSummary?.sampleSize ?? 0;

  const overlayLabel = selectedEvent ? getEventLabel(selectedEvent, eventDisplaySettings) : null;
  const overlayInput: TimeSeriesOverlay | null =
    overlayLabel && overlay ? { label: overlayLabel, series: overlay.series } : null;

  const showLowDataWarning = data.views > 0 && data.views < LOW_DATA_VIEWS_THRESHOLD;

  return (
    <div className="space-y-6">
      <Link
        href={routesHref}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to routes
      </Link>

      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

      <div
        className={cn(
          "sticky top-14 z-40 -mx-3 px-3 transition-all duration-200 sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6",
          isStuck
            ? "border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b py-3 backdrop-blur"
            : "border-transparent bg-transparent py-0",
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
            <h1 className={cn("text-foreground font-mono font-semibold", isStuck ? "text-base" : "text-2xl")}>
              {route}
            </h1>
            <Select
              value={selectedPercentile}
              onValueChange={(value) => void setSelectedPercentile(value as Percentile)}
            >
              <SelectTrigger className="bg-card border-border w-20 shrink-0 sm:w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERCENTILES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <DeviceSelector />
            <TimeRangeSelector />
          </div>
        </div>

        <div
          className={cn(
            "mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 overflow-hidden transition-all duration-200",
            isStuck ? "max-h-0 opacity-0" : "max-h-10 opacity-100",
          )}
        >
          <div className="text-muted-foreground text-sm">
            {data.views.toLocaleString()} tracked views • {selectedMetricSampleSize.toLocaleString()} samples (
            {selectedMetric})
          </div>
          {showLowDataWarning && (
            <div className="text-status-needs-improvement flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Low data. Interpret with caution.</span>
            </div>
          )}
        </div>
      </div>
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-foreground text-lg font-medium">Core Web Vitals</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Core Web Vitals are Google&apos;s key metrics for user experience.</p>
            </TooltipContent>
          </Tooltip>
          <span className="text-muted-foreground text-xs">({percentileLabel})</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CORE_WEB_VITALS.map((metricName) => {
            const metric = metricsByName.get(metricName);
            return (
              <MetricCard
                key={metricName}
                metricName={metricName}
                quantiles={metric?.quantiles ?? null}
                sampleCount={metric?.sampleSize ?? 0}
                selectedPercentile={selectedPercentile}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-foreground text-lg font-medium">Other Metrics</h2>
          <span className="text-muted-foreground text-xs">({percentileLabel})</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {OTHER_METRICS.map((metricName) => {
            const metric = metricsByName.get(metricName);
            return (
              <MetricCard
                key={metricName}
                metricName={metricName}
                quantiles={metric?.quantiles ?? null}
                sampleCount={metric?.sampleSize ?? 0}
                selectedPercentile={selectedPercentile}
              />
            );
          })}
        </div>
      </section>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-foreground text-lg font-medium">Performance Trend</CardTitle>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <MetricSelector
              selected={selectedMetric as unknown as Parameters<typeof MetricSelector>[0]["selected"]}
              onChange={(value) => void setSelectedMetric(value as MetricName)}
              showOtherMetrics
            />
            <Select
              value={selectedEvent || "none"}
              onValueChange={(value) => void setSelectedEvent(value === "none" ? "" : value)}
              disabled={visibleEvents.length === 0}
            >
              <SelectTrigger className="bg-card border-border w-48">
                <SelectValue placeholder="Overlay events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No events</SelectItem>
                {visibleEvents.map((eventName) => (
                  <SelectItem key={eventName} value={eventName}>
                    {getEventLabel(eventName, eventDisplaySettings)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <TimeSeriesChart
            data={data.timeSeries}
            metric={selectedMetric as unknown as Parameters<typeof TimeSeriesChart>[0]["metric"]}
            percentile={selectedPercentile}
            overlay={overlayInput}
            height={300}
            dateRange={dateRange}
            granularity={granularity}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg font-medium">
              {METRIC_INFO[selectedMetric].friendlyLabel} Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionChart
              good={data.distribution.good}
              needsImprovement={data.distribution["needs-improvement"]}
              poor={data.distribution.poor}
            />
          </CardContent>
          <CardFooter className="border-border border-t">
            <div className="flex w-full items-center justify-between text-sm">
              <span className="text-muted-foreground">Total measurements</span>
              <span className="text-foreground font-medium">{selectedMetricSampleSize.toLocaleString()}</span>
            </div>
          </CardFooter>
        </Card>

        <InsightsCard insights={data.insights} />
      </div>
    </div>
  );
}
