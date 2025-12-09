import { env } from '@/env';
import { validateMetricsPayload } from '@/types/metrics';
import { type as arkType } from 'arktype';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.split('Bearer')?.[1].trim();
  if (!token) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const areEqual = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(env.API_TOKEN));
    if (!areEqual) throw new Error('Token is invalid');
  } catch {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let parsedBody;
  try {
    parsedBody = await req.json();
  } catch {
    return Response.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  const validated = validateMetricsPayload(parsedBody);
  if (validated instanceof arkType.errors) {
    const issues = 'summary' in validated ? validated.summary : `${validated}`;
    return Response.json({ message: 'Invalid payload', issues }, { status: 400 });
  }

  const events = (Array.isArray(validated) ? validated : [validated]).filter(Boolean);
  if (events.length === 0) {
    return Response.json({ message: 'No events provided' }, { status: 400 });
  }

  console.info(`Received ${events.length} event(s)`);

  // TODO: implement ClickHouse persistence

  return Response.json({ ok: true });
}
