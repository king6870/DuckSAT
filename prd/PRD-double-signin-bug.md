# PRD: Fix Double Sign-In Bug (www vs non-www Domain Mismatch)

## Problem Statement

Users visiting **ducksat.com** (non-www) must click "Sign In" twice before authentication succeeds. The first attempt redirects to an error page with a second sign-in prompt; the second attempt from that page works.

## Root Cause

A **www vs non-www domain mismatch** causes a CSRF token cookie failure during the Google OAuth callback:

1. User visits `ducksat.com` (non-www) — the browser sets NextAuth's CSRF cookie on `ducksat.com`.
2. User clicks "Sign In" → NextAuth initiates Google OAuth.
3. Google completes authentication and redirects to `https://www.ducksat.com/api/auth/callback/google` (derived from `NEXTAUTH_URL=https://www.ducksat.com`).
4. The CSRF cookie set on `ducksat.com` is **not sent** to `www.ducksat.com` (different subdomain). NextAuth cannot verify the CSRF token → **OAuthCallback error**.
5. NextAuth redirects to the error page on `www.ducksat.com`.
6. The user is now on `www.ducksat.com`. Signing in again works because the CSRF cookie and callback are now on the same domain.

## Impact

- **Every first-time visitor** on `ducksat.com` hits this bug.
- Creates a poor first impression and confusing UX.
- Users may abandon sign-up thinking the site is broken.

## Solution

Enforce a single canonical domain by redirecting `ducksat.com` → `www.ducksat.com` (and `ducksatapp.azurewebsites.net` → `www.ducksat.com`) in Next.js middleware. This ensures:

- All CSRF cookies are set on `www.ducksat.com`.
- The Google OAuth callback URL matches the cookie domain.
- Sign-in succeeds on the first attempt.

## Success Criteria

- Visiting `ducksat.com/any-path?query=value` permanently redirects (301) to `www.ducksat.com/any-path?query=value`.
- Signing in from `ducksat.com` completes in a single click (no error page).
- Existing `ducksatapp.azurewebsites.net` redirect continues to work.
- API routes (`/api/*`) are unaffected by the redirect.

## Out of Scope

- Changing the canonical domain from `www.ducksat.com` to `ducksat.com` (would require updating Google OAuth console, NEXTAUTH_URL, and DNS).
- DNS-level redirects (handled at the application layer).
