import { NextRequest } from "next/server";

export type CorsOptions = {
  allowedOrigins?: string[];
  allowCredentials?: boolean;
  methods?: string[];
};

export function getCorsHeaders(req: Request | NextRequest, options: CorsOptions = {}) {
  const origin = req.headers.get("origin");
  const { 
    allowedOrigins = [], 
    allowCredentials = false, 
    methods = ["GET", "POST", "OPTIONS"] 
  } = options;

  const headers = new Headers({
    "Access-Control-Allow-Methods": methods.join(","),
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-requested-with",
  });

  if (!allowCredentials && allowedOrigins.length === 0) {
    headers.set("Access-Control-Allow-Origin", "*");
    return headers;
  }

  const isAllowed = origin && allowedOrigins.includes(origin);
  
  headers.set("Vary", "Origin");
  
  if (isAllowed) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else {
    headers.set("Access-Control-Allow-Origin", "null");
  }

  if (allowCredentials) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return headers;
}