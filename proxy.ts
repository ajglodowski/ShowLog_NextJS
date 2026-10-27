import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

// Pages anyone can open. Everything else sends signed-out visitors to /login.
const PUBLIC_PREFIXES = ['/login', '/signup', '/api', '/auth']

/**
 * Redirects signed-out visitors, judged by whether the Better Auth session cookie is present.
 * That's an optimistic check for the redirect only: the session is really checked when the
 * server mints an API access token from it (app/utils/auth/server.ts), and a dead one just
 * reads as signed out.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = pathname === '/' || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  if (!isPublic && !getSessionCookie(request)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
