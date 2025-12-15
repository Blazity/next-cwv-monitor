import { randomUUID } from 'node:crypto';
import { UAParser } from 'ua-parser-js';

import type { IngestPayloadV1, WebVitalEventV1 } from 'cwv-monitor-contracts';
import type { IngestCommand, WebVitalEvent } from './types';
import { coerceDeviceType, DEFAULT_DEVICE_TYPE } from '@/app/server/lib/device-types';

function parseDate(value?: string) {
  if (!value) return;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return;
  }
  return date;
}

type UserAgentMeta = ReturnType<UAParser['getResult']>;

function determineDeviceType(userAgent?: UserAgentMeta) {
  return coerceDeviceType(userAgent?.device?.type) ?? DEFAULT_DEVICE_TYPE;
}

export function buildIngestCommand(parsed: IngestPayloadV1, ip: string, userAgentHeader?: string): IngestCommand {
  const eventsInput = parsed.events;
  const events: WebVitalEventV1[] = [];

  if (Array.isArray(eventsInput)) {
    events.push(...eventsInput);
  } else if (eventsInput) {
    events.push(eventsInput);
  }

  const userAgent = new UAParser(userAgentHeader).getResult();
  const now = new Date();

  const normalizedEvents: WebVitalEvent[] = events.map((event) => {
    const sessionId = event.sessionId ?? randomUUID();
    const resolvedRoute = event.route ?? event.path ?? '/';
    const resolvedPath = event.path ?? event.route ?? resolvedRoute;
    const recordedAt = parseDate(event.recordedAt) ?? now;
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
