import { notFound } from "next/navigation";

import { RouteDetailService } from "@/app/server/domain/routes/detail/service";
import { buildRouteDetailQuery } from "@/app/server/domain/routes/detail/mappers";
import { RouteEventOverlayService } from "@/app/server/domain/routes/overlay/service";
import { buildRouteEventOverlayQuery } from "@/app/server/domain/routes/overlay/mappers";
import { fetchProjectEventNames } from "@/app/server/lib/clickhouse/repositories/custom-events-repository";
import { eventDisplaySettingsSchema } from "@/app/server/lib/clickhouse/schema";
import { RouteDetailErrorState } from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/[route]/_components/route-detail-error-state";
import { RouteDetailNotFoundState } from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/[route]/_components/route-detail-not-found-state";
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

function toQueryObject(searchParams: {
  [key: string]: string | string[] | undefined;
}): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      query[key] = value;
      continue;
    }

    if (Array.isArray(value)) {
      query[key] = value;
    }
  }

  return query;
}

type RouteDetailPageProps = {
  params: Promise<{ projectId: string; route: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function RoutePage({ params, searchParams }: RouteDetailPageProps) {
  await getAuthorizedSession();

  const { projectId, route: routeParam } = await params;
  const rawSearchParams = await searchParams;
  const { timeRange, deviceType, metric, percentile, event } = routeDetailSearchParamsCache.parse(rawSearchParams);

  const dateRange = timeRangeToDateRange(timeRange);
  const route = safeDecodeURIComponent(routeParam);

  const detailResult = await routeDetailService.getDetail(
    buildRouteDetailQuery({
      projectId,
      route,
      range: dateRange,
      deviceType,
      selectedMetric: metric,
    }),
  );

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

  const routesQuery = toQueryObject(rawSearchParams);
  const routesHref =
    Object.keys(routesQuery).length > 0
      ? { pathname: `/projects/${projectId}/routes`, query: routesQuery }
      : { pathname: `/projects/${projectId}/routes` };

  if (detailResult.kind === "route-not-found") {
    return <RouteDetailNotFoundState routesHref={routesHref} route={detailResult.route} />;
  }

  const project = await getCachedProject(projectId);
  if (!project) {
    notFound();
  }

  const out = eventDisplaySettingsSchema(project.events_display_settings);
  const eventDisplaySettings = out instanceof ArkErrors ? null : out;

  const eventNameRows = await fetchProjectEventNames({ projectId });
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
      overlay={overlayResult?.kind === "ok" ? overlayResult.data : null}
    />
  );
}
