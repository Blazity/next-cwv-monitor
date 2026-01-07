"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import type { UrlObject } from "node:url";

import { Badge as StatusBadge } from "@/components/badge";
import { statusToBadge } from "@/consts/status-to-badge";
import { MetricSelector } from "@/components/dashboard/metric-selector";
import { DeviceSelector } from "@/components/dashboard/device-selector";
import { TimeRangeSelector } from "@/components/dashboard/time-range-selector";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TimeSeriesChart, type TimeSeriesOverlay } from "@/components/dashboard/time-series-chart";
import PercentileChart from "@/components/dashboard/percentile-chart";
import { CORE_WEB_VITALS, OTHER_METRICS } from "@/consts/metrics";
import { cn, capitalize, formatMetricValue } from "@/lib/utils";
import { QUERY_STATE_OPTIONS, routeDetailSearchParsers, SEARCH_QUERY_OPTIONS } from "@/lib/search-params";
import { getMetricThresholds, getRatingForValue } from "@/app/server/lib/cwv-thresholds";
import { METRIC_INFO } from "@/app/server/lib/cwv-metadata";
import type { EventDisplaySettings } from "@/app/server/lib/clickhouse/schema";
import type { RouteDetail } from "@/app/server/domain/routes/detail/types";
import type { RouteEventOverlay } from "@/app/server/domain/routes/overlay/types";
import { PERCENTILES, type MetricName, type Percentile } from "@/app/server/domain/routes/list/types";
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
  overlay: RouteEventOverlay | null;
};

const LOW_DATA_VIEWS_THRESHOLD = 1000;

type InsightKind = RouteDetail["insights"][number]["kind"];

function getInsightMeta(kind: InsightKind) {
  switch (kind) {
    case "success": {
      return { icon: CheckCircle2, className: "text-status-good bg-status-good/10 border-status-good/20" };
    }
    case "warning": {
      return {
        icon: AlertTriangle,
        className: "text-status-needs-improvement bg-status-needs-improvement/10 border-status-needs-improvement/20",
      };
    }
    case "info": {
      return { icon: Info, className: "text-muted-foreground bg-muted border-border" };
    }
  }
}

function getPercentileValue(
  quantiles: RouteDetail["metrics"][number]["quantiles"],
  percentile: Percentile,
): number | null {
  if (!quantiles) return null;
  return quantiles[percentile];
}

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
          <div className="flex min-w-0 items-center gap-3">
            <h1 className={cn("text-foreground truncate font-mono font-semibold", isStuck ? "text-base" : "text-2xl")}>
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

      <TooltipProvider>
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
            {CORE_WEB_VITALS.map((metricName) => (
              <RouteMetricCard
                key={metricName}
                metricName={metricName}
                metric={metricsByName.get(metricName) ?? null}
                selectedPercentile={selectedPercentile}
              />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-foreground text-lg font-medium">Other Metrics</h2>
            <span className="text-muted-foreground text-xs">({percentileLabel})</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {OTHER_METRICS.map((metricName) => (
              <RouteMetricCard
                key={metricName}
                metricName={metricName}
                metric={metricsByName.get(metricName) ?? null}
                selectedPercentile={selectedPercentile}
              />
            ))}
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

          <Card className="bg-card border-border flex flex-col">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2 text-lg font-medium">
                <Lightbulb className="text-primary h-5 w-5" />
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-3">
                {data.insights.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No insights available.</p>
                ) : (
                  data.insights.map((insight) => {
                    const meta = getInsightMeta(insight.kind);
                    const Icon = meta.icon;

                    return (
                      <div
                        key={`${insight.kind}:${insight.message}`}
                        className={cn("flex items-start gap-3 rounded-lg border p-3", meta.className)}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <p className="text-foreground text-sm">{insight.message}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
            <CardFooter className="border-border border-t">
              <p className="text-muted-foreground text-xs">
                Insights are heuristic-based. Low sample sizes may affect accuracy.
              </p>
            </CardFooter>
          </Card>
        </div>
      </TooltipProvider>
    </div>
  );
}

function RouteMetricCard({
  metricName,
  metric,
  selectedPercentile,
}: {
  metricName: MetricName;
  metric: RouteDetail["metrics"][number] | null;
  selectedPercentile: Percentile;
}) {
  const info = METRIC_INFO[metricName];
  const thresholds = getMetricThresholds(metricName);
  const value = getPercentileValue(metric?.quantiles ?? null, selectedPercentile);
  const status = typeof value === "number" ? getRatingForValue(metricName, value) : null;
  const sampleSize = metric?.sampleSize ?? 0;

  if (!metric?.quantiles) {
    return (
      <Card className="bg-card border-border opacity-60">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg">{info.friendlyLabel}</CardTitle>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span className="font-medium">{metricName}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="border-border mt-2 flex flex-col items-center justify-center border-t border-dashed py-4">
          <p className="text-muted-foreground text-xs tracking-wider uppercase">No Data Available</p>
        </CardContent>
      </Card>
    );
  }

  const percentileItems = (
    [
      { label: "P50", value: metric.quantiles.p50 },
      { label: "P75", value: metric.quantiles.p75 },
      { label: "P90", value: metric.quantiles.p90 },
      { label: "P95", value: metric.quantiles.p95 },
      { label: "P99", value: metric.quantiles.p99 },
    ] as const
  ).map((p) => ({ label: p.label, value: p.value, type: getRatingForValue(metricName, p.value) }));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg">{info.friendlyLabel}</CardTitle>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span className="font-medium">{metricName}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="hover:text-foreground transition-colors">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">{info.name}</p>
                <p className="mt-1 text-xs">{info.description}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        {status && <StatusBadge {...statusToBadge[status]} size="sm" />}
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-foreground font-mono text-2xl font-semibold">
              {typeof value === "number" ? formatMetricValue(metricName, value) : "--"}
            </span>
            <span className="text-muted-foreground text-sm">{selectedPercentile.toUpperCase()}</span>
          </div>
          <span className="text-muted-foreground text-xs">{sampleSize.toLocaleString()} samples</span>
        </div>

        <PercentileChart
          title="View all percentiles"
          metric={metricName}
          selectedLabel={selectedPercentile.toUpperCase()}
          thresholds={thresholds}
          percentiles={percentileItems}
        />
      </CardContent>
    </Card>
  );
}

function DistributionChart({ good, needsImprovement, poor }: { good: number; needsImprovement: number; poor: number }) {
  const total = good + needsImprovement + poor;

  const segments = [
    {
      name: "Good",
      value: good,
      percent: total > 0 ? (good / total) * 100 : 0,
      fill: "var(--status-good)",
    },
    {
      name: "Needs improvement",
      value: needsImprovement,
      percent: total > 0 ? (needsImprovement / total) * 100 : 0,
      fill: "var(--status-needs-improvement)",
    },
    {
      name: "Poor",
      value: poor,
      percent: total > 0 ? (poor / total) * 100 : 0,
      fill: "var(--status-poor)",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="bg-muted flex h-3 overflow-hidden rounded-full">
        {segments.map((item) => (
          <div
            key={item.name}
            className="h-full transition-all duration-300"
            style={{ width: `${item.percent}%`, backgroundColor: item.fill }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        {segments.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className="text-muted-foreground text-xs">
              {item.name}: <span className="text-foreground font-medium">{item.percent.toFixed(1)}%</span>
              <span className="text-muted-foreground ml-1">({item.value.toLocaleString()})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
