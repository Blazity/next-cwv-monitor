import { randomUUID } from "node:crypto";
import { UAParser } from "ua-parser-js";

import type { IngestPayloadV1 } from "cwv-monitor-contracts";
import type { CustomEvent, IngestCommand, WebVitalEvent } from "@/app/server/domain/ingest/types";
import { coerceDeviceType, DEFAULT_DEVICE_TYPE } from "@/app/server/lib/device-types";

type UserAgentMeta = ReturnType<UAParser["getResult"]>;

function determineDeviceType(userAgent?: UserAgentMeta) {
  return coerceDeviceType(userAgent?.device.type) ?? DEFAULT_DEVICE_TYPE;
}

export function buildIngestCommand(
  parsed: IngestPayloadV1,
  ip: string | null,
  userAgentHeader?: string
): IngestCommand {
  const userAgent = new UAParser(userAgentHeader).getResult();
  const now = new Date();

  const deviceType = determineDeviceType(userAgent);

  const cwvEvents: WebVitalEvent[] = (parsed.events ?? []).map((event) => {
    const sessionId = event.sessionId ?? randomUUID();
    const resolvedRoute = event.route ?? event.path ?? "/";
    const resolvedPath = event.path ?? event.route ?? resolvedRoute;
    const recordedAt = event.recordedAt ?? now;

    return {
      sessionId,
      route: resolvedRoute,
      path: resolvedPath,
      metric: event.metric,
      value: event.value,
      rating: event.rating,
      recordedAt,
      deviceType
    };
  });

  const customEvents: CustomEvent[] = (parsed.customEvents ?? []).map((event) => {
    const sessionId = event.sessionId ?? randomUUID();
    const resolvedRoute = event.route ?? event.path ?? "/";
    const resolvedPath = event.path ?? event.route ?? resolvedRoute;
    const recordedAt = event.recordedAt ?? now;

    return {
      sessionId,
      route: resolvedRoute,
      path: resolvedPath,
      name: event.name,
      recordedAt,
      deviceType
    };
  });

  return {
    ip,
    projectId: parsed.projectId,
    cwvEvents,
    customEvents
  };
}
