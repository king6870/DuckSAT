import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')
  const azureUrl = 'ducksatapp.azurewebsites.net'

  // If the request is coming to the azurewebsites.net domain
  if (host === azureUrl) {
    // Redirect to the custom domain while preserving the path and query params
    return NextResponse.redirect(
      `https://www.ducksat.com${request.nextUrl.pathname}${request.nextUrl.search}`,
      301 // Permanent redirect
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
