import { NextRequest, NextResponse } from "next/server";
import { type as arkType } from "arktype";
import { IngestPayloadV1Schema } from "cwv-monitor-contracts";

import { env } from "@/env";
import { logger } from "@/app/server/lib/logger";
import { ipRateLimiter } from "@/app/server/lib/rate-limit";
import { buildIngestCommand } from "@/app/server/domain/ingest/mappers";
import { IngestService } from "@/app/server/domain/ingest/service";

const corsHeaders = {
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export async function OPTIONS(req?: NextRequest) {
  const origin = req?.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: cors(origin),
  });
}

const trustProxy = env.TRUST_PROXY === "true";

type IngestResponse = {
  status: number;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
};

const ingestService = new IngestService(ipRateLimiter);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req, trustProxy);
  const origin = req.headers.get("origin");

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    logger.warn({ ip }, "ingest.invalid_json");
    return NextResponse.json(
      { message: "Invalid JSON payload" },
      {
        status: 400,
        headers: cors(origin),
      },
    );
  }

  const userAgentHeader = req.headers.get("user-agent") ?? undefined;
  const result = await handleIngest(ip, rawBody, origin, userAgentHeader);

  const responseOrigin = result.status === 403 ? "*" : origin;

  if (result.status === 204) {
    return new Response(null, {
      status: 204,
      headers: cors(responseOrigin, result.headers),
    });
  }

  return NextResponse.json(result.body ?? {}, {
    status: result.status,
    headers: cors(responseOrigin, result.headers),
  });
}

async function handleIngest(
  ip: string | null,
  payload: unknown,
  origin: string | null,
  userAgentHeader?: string,
): Promise<IngestResponse> {
  const parsed = IngestPayloadV1Schema(payload);
  if (parsed instanceof arkType.errors) {
    const issues = "summary" in parsed ? parsed.summary : `${parsed}`;
    logger.warn({ ip, issues }, "ingest.invalid_schema");
    return {
      status: 400,
      body: { message: "Invalid payload", issues },
    };
  }

  const cwvEvents = parsed.events ?? [];
  const customEvents = parsed.customEvents ?? [];

  if (cwvEvents.length === 0 && customEvents.length === 0) {
    return {
      status: 400,
      body: { message: "No events provided" },
    };
  }

  const command = buildIngestCommand(parsed, ip, origin, userAgentHeader);
  const result = await ingestService.handle(command);

  if (result.kind === "rate-limit") {
    logger.warn({ ip }, "ingest.rate_limit_exceeded");
    const retryAfterSeconds = Math.max(Math.ceil((result.rate.resetAt - Date.now()) / 1000), 1);
    return {
      status: 429,
      body: { message: "Too many requests" },
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    };
  }

  if (result.kind === "project-not-found") {
    return {
      status: 404,
      body: { message: "Project not found" },
    };
  }

  if (result.kind === "domain-mismatch") {
    return {
      status: 403,
      body: { message: "Origin not authorized" },
    };
  }

  return { status: 204 };
}

function cors(origin: string | null = "*", init?: HeadersInit) {
  const headers = new Headers(init);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  headers.set("Access-Control-Allow-Origin", origin || "*");
  return headers;
}

function getClientIp(req: NextRequest, allowForwardedHeaders: boolean): string | null {
  if (!allowForwardedHeaders) return null;

  const forwardedFor = getForwardedHeader(req.headers.get("x-forwarded-for"));
  if (forwardedFor) return forwardedFor;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfConnecting = req.headers.get("cf-connecting-ip")?.trim();
  if (cfConnecting) return cfConnecting;

  return null;
}

function getForwardedHeader(value: string | null): string | undefined {
  if (!value) return undefined;
  for (const part of value.split(",")) {
    const candidate = part.trim();
    if (candidate) return candidate;
  }
  return undefined;
}
