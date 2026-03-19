# SPEC: Fix Double Sign-In Bug — Canonical Domain Redirect

## Overview

Add a `ducksat.com` → `www.ducksat.com` redirect in `src/middleware.ts` to eliminate the CSRF cookie domain mismatch that causes the double sign-in bug.

## Current State

```typescript
// src/middleware.ts — only handles Azure subdomain
if (host === 'ducksatapp.azurewebsites.net') {
  return NextResponse.redirect(`https://www.ducksat.com${path}${search}`, 301)
}
```

The middleware only redirects the Azure hostname. Visitors on `ducksat.com` (non-www) are not redirected, causing CSRF cookies to be set on the wrong domain.

## Changes

### File: `src/middleware.ts`

**Before:** Single redirect for `ducksatapp.azurewebsites.net`.

**After:** Redirect both `ducksatapp.azurewebsites.net` and `ducksat.com` (non-www) to `https://www.ducksat.com`, preserving path and query string. Use 301 (permanent redirect) for SEO correctness and browser caching.

```typescript
export function middleware(request: NextRequest) {
  const host = request.headers.get('host')

  // Redirect non-canonical domains to www.ducksat.com
  if (host === 'ducksatapp.azurewebsites.net' || host === 'ducksat.com') {
    return NextResponse.redirect(
      `https://www.ducksat.com${request.nextUrl.pathname}${request.nextUrl.search}`,
      301
    )
  }

  return NextResponse.next()
}
```

### Middleware Matcher (unchanged)

```typescript
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

The matcher already excludes `/api/*` routes, so the Google OAuth callback (`/api/auth/callback/google`) is unaffected.

## Testing

1. Visit `https://ducksat.com` → should 301 redirect to `https://www.ducksat.com`.
2. Visit `https://ducksat.com/about?foo=bar` → should 301 redirect to `https://www.ducksat.com/about?foo=bar`.
3. Click "Sign In" from `https://ducksat.com` → should redirect to `www.ducksat.com` first, then OAuth completes in one click.
4. `https://ducksatapp.azurewebsites.net` redirect still works.
5. `https://www.ducksat.com/api/auth/callback/google` is not intercepted by middleware.

## Risks

- **Browser caching of 301:** If we ever change canonical domain, browsers with cached 301s would still redirect. Acceptable risk since `www.ducksat.com` is the intended canonical domain.
- **None for auth flow:** API routes are excluded from middleware, so OAuth callbacks are unaffected.
