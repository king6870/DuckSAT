# SPEC: DuckSAT Full-Scale Go-Live Readiness (2026-05-02)

## 1. Objective
DuckSAT must be production-ready with validated behavior across:
- UI feature flows (including button interactions)
- API endpoints and database operations
- Question correctness/passability
- Reliability, security, and performance

This spec defines mandatory quality gates and evidence required before go-live.

## 2. Non-Negotiable Outcome
The release is approved only when all P0 and P1 gates pass and evidence artifacts are generated and archived.

## 3. Scope
In scope:
- Next.js app routes and user/admin flows
- All API routes under src/app/api
- Database schema invariants and data quality checks
- SAT question passability and quality rules
- Core production readiness checks (perf/security/observability)

Out of scope (for this phase):
- New feature development unrelated to launch blockers
- Major architecture rewrites unless required to satisfy P0 gates

## 4. Definitions
- Passable question: can be answered unambiguously with one valid correct option, coherent explanation, and valid structure.
- Reachable endpoint: endpoint responds without server error for expected auth/validation paths.
- Button works: click action does one of expected outcomes (navigation, modal, submit, mutation, feedback) with no console/runtime error.

## 5. Quality Gates

### 5.1 P0 (Must Pass)
1. App startup/build:
- npm run build succeeds.
- Production start smoke check succeeds.

2. Route stability:
- Every public and protected page route in the route map responds without 5xx.

3. API stability:
- Every API endpoint has at least one smoke test path.
- No endpoint returns unexpected 5xx under valid or invalid input paths.

4. Database integrity:
- Migration status clean.
- No orphaned FK references.
- Required fields non-null where business-critical.

5. Question passability:
- 100% questions satisfy structural validity:
  - question text present
  - exactly 4 options
  - correctAnswer index in [0..3]
  - explanation non-empty and meaningful
- Diagramless release profile:
  - 0 records with diagram markers when diagramless mode is required.

6. Critical user flows:
- Auth (signup/login/logout)
- Start practice test
- Submit answers and persist results
- View progress
- Admin question review path

7. Error handling:
- User-facing failures show controlled errors (no raw stack traces)
- Server logs include enough context (endpoint, request id when available)

### 5.2 P1 (Should Pass Before Launch)
1. Button interaction coverage on critical screens >= 95% by automated click-matrix tests.
2. API contract checks for critical endpoints include success + validation + auth scenarios.
3. Performance:
- p95 API latency targets met for core endpoints under representative load.
4. Security:
- Authz checks validated on admin and privileged endpoints.
- Stripe webhook signature validation path tested.

### 5.3 P2 (Post-Launch Harden)
1. Extended browser matrix.
2. Soak/load tests.
3. Deeper fuzzing on API payloads.

## 6. Test Catalog

### 6.1 Static + Build Verification
- TypeScript strict check
- ESLint
- Next.js build

### 6.2 API Test Suite
For each API route:
- Smoke request path
- Validation failure path
- Auth failure path (where protected)
- Happy path for critical routes

### 6.3 UI/Feature Suite
- Route load tests (all navigable app routes)
- Button click-matrix tests for critical screens:
  - landing/home
  - auth
  - dashboard
  - practice/practice-tests
  - progress
  - admin key screens

### 6.4 Database/Data Suite
- Schema FK health checks
- Critical counts and null checks
- Question structural validation and duplicate detection

### 6.5 Question Passability Suite
For each question:
- Structural checks (format)
- Option consistency checks
- Explanation sanity checks
- Category/subtopic normalization checks
- Optional AI adjudication pass for ambiguous cases

## 7. Mandatory Evidence Artifacts
Each go-live run must produce:
- go-live readiness JSON report
- go-live readiness markdown summary
- Failed test inventory with owner and ETA
- Question quality report with counts and IDs for failures

## 8. Exit Criteria
Release approved only if:
- All P0 gates green
- No unresolved P0 defects
- Any remaining P1 issues have explicit waiver + mitigation
- Evidence artifacts committed and reviewed

## 9. Defect Severity Policy
- P0: blocks launch immediately
- P1: launch only with explicit waiver
- P2: backlog after launch

## 10. Rollback and Recovery Criteria
Rollback required if post-release:
- Core flows fail (auth/practice/submit/progress)
- Unexpected 5xx spike
- Data integrity breach

Recovery plan must include:
- last-known-good deploy
- DB backup restore strategy
- incident report and fix-forward timeline
