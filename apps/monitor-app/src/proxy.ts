import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

const PUBLIC_ROUTES = ['/login', '/api/auth', '/api/health', '/api/ingest'];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  const requestHeaders = request.headers;
  
  const fullPath = `${pathname}${search}`;
  requestHeaders.set('x-current-path', fullPath);

  if (isPublicRoute) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  try {
    const session = await auth.api.getSession({
      headers: requestHeaders, 
    });

    if (!session) {
      const loginUrl = new URL('/login', request.url);
      if (pathname !== '/') {
        loginUrl.searchParams.set('callbackUrl', fullPath);
      }
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'
  ]
};
