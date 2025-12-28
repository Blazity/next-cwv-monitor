import { getAuthorizedSession } from "@/lib/auth-utils";
import { getProjectById } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { fetchRouteEventOverlaySeries } from "@/app/server/lib/clickhouse/repositories/dashboard-routes-repository";

import type {
  GetRouteEventOverlayQuery,
  GetRouteEventOverlayResult,
  RouteEventOverlayPoint,
} from "@/app/server/domain/routes/overlay/types";

function toRatePct(conversions: number, views: number): number | null {
  if (views <= 0) return null;
  return (conversions / views) * 100;
}

export class RouteEventOverlayService {
  async getOverlay(query: GetRouteEventOverlayQuery): Promise<GetRouteEventOverlayResult> {
    await getAuthorizedSession();

    const project = await getProjectById(query.projectId);
    if (!project) {
      return { kind: "project-not-found", projectId: query.projectId };
    }

    const baseFilters = {
      projectId: query.projectId,
      range: query.range,
      deviceType: query.deviceType,
    } as const;

    const rows = await fetchRouteEventOverlaySeries({
      ...baseFilters,
      route: query.route,
      eventName: query.eventName,
    });

    const series: RouteEventOverlayPoint[] = rows.map((row) => {
      const views = Number(row.views || 0);
      const conversions = Number(row.conversions || 0);
      return {
        date: row.event_date,
        views,
        conversions,
        conversionRatePct: toRatePct(conversions, views),
      };
    });

    const totals = { views: 0, conversions: 0 };
    for (const point of series) {
      totals.views += point.views;
      totals.conversions += point.conversions;
    }

    return {
      kind: "ok",
      data: {
        eventName: query.eventName,
        series,
        totals: {
          ...totals,
          conversionRatePct: toRatePct(totals.conversions, totals.views),
        },
      },
    };
  }
}
