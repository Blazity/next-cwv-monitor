import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lightweight proxy for routing - auth checks done in server components
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't need any special handling
  const publicRoutes = ['/login', '/setup', '/api/auth', '/api/health'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Allow public routes and static assets
  if (isPublicRoute || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};

