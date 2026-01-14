"use client";

import { useParams, useSearchParams } from "next/navigation";

import { RouteDetailNotFoundState } from "@/app/(protected)/(dashboard)/projects/[projectId]/routes/[route]/_components/route-detail-not-found-state";

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function NotFound() {
  const params = useParams<{ projectId: string; route: string }>();
  const searchParams = useSearchParams();

  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const routeParam = Array.isArray(params.route) ? params.route[0] : params.route;

  const route = safeDecodeURIComponent(routeParam ?? "");

  const qs = searchParams.toString();
  const routesHref = qs ? `/projects/${projectId}/routes?${qs}` : `/projects/${projectId}/routes`;

  return <RouteDetailNotFoundState routesHref={routesHref} route={route} />;
}
