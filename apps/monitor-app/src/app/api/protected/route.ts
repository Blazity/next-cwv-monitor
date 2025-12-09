import { env } from '@/env';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';

export async function GET(req: NextRequest) {
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
  return Response.json({ ok: true });
}
