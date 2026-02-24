# DuckSAT Error Resolution: Technical Specification (2026-02-23)

## 1. Authentication & Session Errors

### Root Causes
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` are not set or not loaded in production.
- Session cookies are not sent with client fetches.
- Admin email is missing from `ADMIN_EMAILS`.

### Fixes
- Set all required env vars in Vercel/Azure dashboard (not just .env.local).
- Refactor API routes to check session and admin email, return 401 with clear error if missing.
- Use `{ credentials: 'include' }` in all client fetches to `/api/auth/session` and admin endpoints.
- Add all admin emails to `ADMIN_EMAILS`.

## 2. API Endpoint Robustness

### Root Causes
- Client fetches do not pass session cookies.
- Prisma errors are not handled.
- Broken batch files cause parsing errors.

### Fixes
- Refactor all API routes to catch errors and return structured error responses.
- Add detailed logging for session/auth failures.
- Run `scripts/find-broken-json.ts` and fix all broken batch files.

## 3. Image & Diagram Loading

### Root Causes
- Images are set to lazy load, but image data is missing or not loaded from the database.
- `vega-canvas` requires `canvas` dependency, which is not installed.

### Fixes
- Preload images and diagrams, avoid lazy loading for critical content.
- Install `canvas` dependency (`npm install canvas`).
- Refactor `ChartRenderer.tsx` to handle missing diagrams gracefully and show fallback SVG.

## 4. Environment Variable Management

### Root Causes
- Environment variables not loaded in production; NextAuth fails.

### Fixes
- Set all required env vars in Vercel/Azure dashboard.
- Add health check endpoint `/api/admin/health-check` to verify env vars and service connectivity.

## 5. Error Logging & Troubleshooting

### Root Causes
- Errors are cryptic, logs are missing context.

### Fixes
- Enhance error logging in `src/lib/auth.ts` and all API routes to include environment, timestamp, and error code.
- Update `/auth/error` page to show actionable troubleshooting steps.

## 6. Testing & Validation

### Root Causes
- Broken JSON files, invalid batch imports, missing diagrams.

### Fixes
- Run `scripts/find-broken-json.ts` and fix all broken batch files.
- Validate all imported questions with `scripts/verify-imported-questions.ts`.
- Add integration tests for `/api/auth/session`, `/api/admin/questions`, and diagram/image endpoints.

## Implementation Steps

1. Set all required env vars in production dashboard.
2. Refactor session checks in all API routes.
3. Refactor fetch calls to use credentials.
4. Add structured error handling.
5. Install `canvas` dependency.
6. Refactor diagram rendering.
7. Enhance logs in all critical files.
8. Run scripts to validate JSON and imported questions.
9. Add integration tests.

## Root Cause Summary
- Missing or misconfigured environment variables.
- Session not created or not passed to API routes.
- Admin email not recognized.
- Missing dependencies (`canvas`).
- Broken batch files.
- Images not stored or served correctly.

---

This spec is actionable, detailed, and directly addresses every error with exact fixes and implementation steps.