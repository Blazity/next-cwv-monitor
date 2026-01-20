import { notFound } from "next/navigation";

import { RouteDetailService } from "@/app/server/domain/routes/detail/service";
import { buildRouteDetailQuery } from "@/app/server/domain/routes/detail/mappers";
import { RouteEventOverlayService } from "@/app/server/domain/routes/overlay/service";
import { buildRouteEventOverlayQuery } from "@/app/server/domain/routes/overlay/mappers";
import { fetchProjectEventNames } from "@/app/server/lib/clickhouse/repositories/custom-events-repository";
import { eventDisplaySettingsSchema } from "@/app/server/lib/clickhouse/schema";
import { RouteDetailErrorState } from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/[route]/_components/route-detail-error-state";
import { RouteDetailView } from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/[route]/_components/route-detail-view";
import { getAuthorizedSession } from "@/lib/auth-utils";
import { getCachedProject } from "@/lib/cache";
import { routeDetailSearchParamsCache } from "@/lib/search-params";
import { timeRangeToDateRange } from "@/lib/utils";
import { ArkErrors } from "arktype";

const routeDetailService = new RouteDetailService();
const overlayService = new RouteEventOverlayService();

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function RoutePage({ params, searchParams }: PageProps<"/projects/[projectId]/routes/[route]">) {
  await getAuthorizedSession();

  const { projectId, route: routeParam } = await params;
  const rawSearchParams = await searchParams;
  const { timeRange, deviceType, metric, percentile, event } = routeDetailSearchParamsCache.parse(rawSearchParams);

  const dateRange = timeRangeToDateRange(timeRange);
  const route = safeDecodeURIComponent(routeParam);

  const detailPromise = routeDetailService.getDetail(
    buildRouteDetailQuery({
      projectId,
      route,
      range: dateRange,
      deviceType,
      selectedMetric: metric,
    }),
  );
  const projectPromise = getCachedProject(projectId);
  const eventNamesPromise = fetchProjectEventNames({ projectId });
  const [detailResult, project, eventNameRows] = await Promise.all([
    detailPromise,
    projectPromise,
    eventNamesPromise,
  ]);

  if (detailResult.kind === "project-not-found") {
    notFound();
  }

  if (detailResult.kind === "unsupported-metric") {
    return (
      <div className="space-y-6">
        <RouteDetailErrorState message={`Metric "${detailResult.metricName}" is not supported.`} />
      </div>
    );
  }

  const routesQuery = Object.fromEntries(
    Object.entries(rawSearchParams).filter((entry): entry is [string, string | string[]] => entry[1] !== undefined),
  );
  const routesHref = { pathname: `/projects/${projectId}/routes`, query: routesQuery };

  if (detailResult.kind === "route-not-found") {
    notFound();
  }

  if (!project) {
    notFound();
  }

  const out = eventDisplaySettingsSchema(project.events_display_settings);
  const eventDisplaySettings = out instanceof ArkErrors ? null : out;

  const eventNames = eventNameRows.map((row) => row.event_name);
  const visibleEvents = eventNames.filter((name) => {
    const settings = eventDisplaySettings?.[name];
    return settings ? !settings.isHidden : true;
  });

  const selectedEvent = visibleEvents.includes(event) ? event : "";
  const overlayResult = selectedEvent
    ? await overlayService.getOverlay(
        buildRouteEventOverlayQuery({
          projectId,
          route,
          range: dateRange,
          deviceType,
          eventName: selectedEvent,
        }),
      )
    : null;

  if (overlayResult?.kind === "project-not-found") {
    notFound();
  }

  return (
    <RouteDetailView
      projectId={projectId}
      route={route}
      routesHref={routesHref}
      data={detailResult.data}
      visibleEvents={visibleEvents}
      eventDisplaySettings={eventDisplaySettings}
      selectedMetric={metric}
      selectedPercentile={percentile}
      selectedEvent={selectedEvent}
      dateRange={dateRange}
      overlay={overlayResult?.kind === "ok" ? overlayResult.data : null}
    />
  );
}
