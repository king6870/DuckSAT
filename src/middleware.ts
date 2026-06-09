import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require an authenticated session (server-side guard)
const AUTH_REQUIRED_PREFIXES = [
  '/dashboard',
  '/practice',
  '/progress',
  '/referrals',
  '/friends',
  '/group-study',
  '/onboarding',
  '/question-review',
  '/review',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host')

  // Redirect non-canonical Azure/apex domains to www.ducksat.com
  if (host === 'ducksatapp.azurewebsites.net' || host === 'ducksat.com') {
    return NextResponse.redirect(
      `https://www.ducksat.com${pathname}${request.nextUrl.search}`,
      301,
    )
  }

  // Server-side auth guard for protected user routes
  const isProtected = AUTH_REQUIRED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )

  if (isProtected) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token) {
      const signinUrl = new URL('/auth/signin', request.url)
      signinUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signinUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|duck-logo.svg|generated-images).*)',
  ],
}
