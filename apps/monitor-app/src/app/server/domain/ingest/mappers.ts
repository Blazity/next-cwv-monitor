import { randomUUID } from 'node:crypto';
import { UAParser } from 'ua-parser-js';

import type { IngestPayloadV1 } from 'cwv-monitor-contracts';
import type { IngestCommand, WebVitalEvent } from './types';
import { coerceDeviceType, DEFAULT_DEVICE_TYPE } from '@/app/server/lib/device-types';

type UserAgentMeta = ReturnType<UAParser['getResult']>;

function determineDeviceType(userAgent?: UserAgentMeta) {
  return coerceDeviceType(userAgent?.device?.type) ?? DEFAULT_DEVICE_TYPE;
}

export function buildIngestCommand(
  parsed: IngestPayloadV1,
  ip: string | null,
  userAgentHeader?: string
): IngestCommand {
  const userAgent = new UAParser(userAgentHeader).getResult();
  const now = new Date();

  const normalizedEvents: WebVitalEvent[] = parsed.events.map((event) => {
    const sessionId = event.sessionId ?? randomUUID();
    const resolvedRoute = event.route ?? event.path ?? '/';
    const resolvedPath = event.path ?? event.route ?? resolvedRoute;
    const recordedAt = event.recordedAt ?? now;
    const deviceType = determineDeviceType(userAgent);

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

  return {
    ip,
    projectId: parsed.projectId,
    events: normalizedEvents
  };
}
