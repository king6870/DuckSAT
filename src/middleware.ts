import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')

  // Redirect non-canonical domains to www.ducksat.com
  // This ensures CSRF cookies and OAuth callbacks use the same domain
  if (host === 'ducksatapp.azurewebsites.net' || host === 'ducksat.com') {
    return NextResponse.redirect(
      `https://www.ducksat.com${request.nextUrl.pathname}${request.nextUrl.search}`,
      301
    )
  }

  return NextResponse.next()
}

// Ensure this only runs on actual page routes, not static assets/images
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
