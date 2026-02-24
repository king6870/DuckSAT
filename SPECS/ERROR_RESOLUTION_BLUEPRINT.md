# DuckSAT Error Resolution Blueprint

## 1. Environment Setup
- [ ] List all required environment variables: NEXTAUTH_URL, NEXTAUTH_SECRET, DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- [ ] Set these variables in Vercel/Azure dashboard (not just .env.local)
- [ ] Add health check endpoint `/api/admin/health-check` to verify env vars and service connectivity

## 2. Authentication Refactor
- [ ] Update `ADMIN_EMAILS` in `src/constants/adminEmails.ts` with all admin emails
- [ ] Refactor session checks in all API routes to return 401 with clear error if session or admin email is missing
- [ ] Use `{ credentials: 'include' }` in all client fetches to `/api/auth/session` and admin endpoints

## 3. API Endpoint Robustness
- [ ] Refactor all API routes to catch errors and return structured error responses
- [ ] Add detailed logging for session/auth failures
- [ ] Run `scripts/find-broken-json.ts` and fix all broken batch files

## 4. Image & Diagram Loading
- [ ] Preload images and diagrams, avoid lazy loading for critical content
- [ ] Install `canvas` dependency (`npm install canvas`)
- [ ] Refactor `ChartRenderer.tsx` to handle missing diagrams gracefully and show fallback SVG

## 5. Error Logging & Troubleshooting
- [ ] Enhance error logging in `src/lib/auth.ts` and all API routes to include environment, timestamp, and error code
- [ ] Update `/auth/error` page to show actionable troubleshooting steps

## 6. Testing & Validation
- [ ] Run `scripts/find-broken-json.ts` and fix all broken batch files
- [ ] Validate all imported questions with `scripts/verify-imported-questions.ts`
- [ ] Add integration tests for `/api/auth/session`, `/api/admin/questions`, and diagram/image endpoints

## 7. Implementation Steps
1. Set all required env vars in production dashboard
2. Refactor session checks in all API routes
3. Refactor fetch calls to use credentials
4. Add structured error handling
5. Install `canvas` dependency
6. Refactor diagram rendering
7. Enhance logs in all critical files
8. Run scripts to validate JSON and imported questions
9. Add integration tests

---

This blueprint breaks down the spec into actionable steps and checklists for implementation.