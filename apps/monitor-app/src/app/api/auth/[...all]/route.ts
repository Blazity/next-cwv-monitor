import { auth } from "@/lib/auth";
import { env } from "@/env";
import { toNextJsHandler } from "better-auth/next-js";
import { getCorsHeaders } from "@/app/server/lib/cors";

const handler = toNextJsHandler(auth);
const authCorsOptions = {
  allowedOrigins: [env.AUTH_BASE_URL],
  allowCredentials: true,
  methods: ["GET", "POST", "OPTIONS", "PATCH", "DELETE"],
};

const withCors = (method: keyof typeof handler) => async (req: Request) => {
  const res = await handler[method](req);
  const corsHeaders = getCorsHeaders(req, authCorsOptions);
  for (const [k, v] of corsHeaders.entries()) res.headers.set(k, v);
  return res;
};

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req, authCorsOptions),
  });
}

export const GET = withCors("GET");
export const POST = withCors("POST");
export const PATCH = withCors("PATCH");
export const PUT = withCors("PUT");
export const DELETE = withCors("DELETE");