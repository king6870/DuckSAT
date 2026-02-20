# Code Review: Epic #61 — Fixed SAT Practice Tests

**Reviewer**: Code Reviewer Agent  
**Date**: February 19, 2026  
**Epic**: #61 — Fixed SAT Practice Tests  
**Issues**: #62 (Schema), #63 (APIs), #65 (UI), #66 (Attempt Tracking), #67 (Admin), #68 (Seeding)  
**Commits**: `4e554e9`, `daead6c`, `8cc87f7`, `c69511d`, `c3a7aba`, `eac7b6e`  

---

## 1. Executive Summary

Epic #61 implements a fixed practice test system with 2 seeded tests (98 questions each), reservation logic, dual-mode test engine, admin CRUD, and a selection UI. The overall architecture is sound — the join-table reservation model with `PracticeTestQuestion` and `isReserved` flag is a clean design. However, the implementation has **several issues that must be fixed before production**, including a critical reservation-bypass bug, duplicated JSX, missing admin authorization, and a Zod error-property bug.

**Decision**: ⚠️ **CHANGES REQUESTED** — 3 Critical, 4 Major, 5 Minor issues found.

---

## 2. Code Quality

### Strengths
- Clean separation of concerns: schema, APIs, hooks, pages
- Comprehensive Zod validation on the admin create endpoint
- Good use of Prisma transactions for atomic publish + reservation
- Dual-mode hook design is elegant — single `practiceTestId` parameter drives behavior
- Seeding script has good diagnostics (logs per-category counts)
- Module caching in `allPracticeTestModules` avoids redundant fetches

### Issues Found

| ID | Severity | File | Line(s) | Issue |
|----|----------|------|---------|-------|
| CQ-1 | **Critical** | `src/hooks/useTestState.ts` | 96 | Random test mode fetches from `/api/questions` which does NOT exclude reserved questions — bypasses entire reservation system |
| CQ-2 | **Critical** | `src/app/page.tsx` | 167-173 | **Duplicated JSX** — closing `</p>`, `<div>`, `</div>`, `</div>`, `</div>` block duplicated after line 166, producing malformed HTML |
| CQ-3 | **Major** | `src/app/api/admin/practice-tests/route.ts` | 164, 207 | Variable name `module` shadows Node.js/webpack global `module` — Next.js linter flags `no-assign-module-variable` |
| CQ-4 | **Major** | `src/app/api/admin/practice-tests/route.ts` | 57 | `validationResult.error.errors` is `undefined` at runtime — Zod `ZodError` uses `.issues`, not `.errors`. Validation failure returns `details: undefined` |
| CQ-5 | **Minor** | All 5 new API routes | L9 | Import `getServerSession` from `'next-auth'` instead of `'next-auth/next'` — inconsistent with existing routes (works at runtime but triggers TS errors in strict mode) |
| CQ-6 | **Minor** | `src/app/api/practice-tests/route.ts` | 13 | Unused parameter `request: NextRequest` — should use `_request` prefix |
| CQ-7 | **Minor** | `src/app/api/practice-tests/[id]/route.ts` | 81 | `whereClause: any` — explicit `Prisma.PracticeTestQuestionWhereInput` type should be used |
| CQ-8 | **Minor** | `src/app/practice-test/page.tsx` | 61, 97 | `setSubmitError` and `upperAnswerKeys` unused — pre-existing but not addressed |

---

## 3. Architecture & Design

### Schema Design — Good ✅

The join-table model (`PracticeTest` → `PracticeTestQuestion` → `Question`) with `moduleIndex`/`orderIndex` is the right approach:
- `@@unique([practiceTestId, orderIndex])` prevents duplicate ordering
- `@@unique([practiceTestId, questionId])` prevents question reuse within a test
- `@@index([practiceTestId, moduleIndex])` optimizes module-scoped queries
- `@@index([isActive, isReserved, moduleType])` optimizes random test exclusions

The `isReserved` flag on `Question` is a denormalization that speeds up the hot path (random question filtering) at the cost of requiring transactional updates during publish. This tradeoff is reasonable.

**One concern**: The index `[isActive, isReserved, moduleType]` was added but the main `/api/questions` route doesn't use `isReserved` — the index benefits only `/api/questions/practice` currently.

### API Design — Good with Gaps

- List endpoint properly handles authenticated vs unauthenticated responses
- Detail endpoint correctly orders by `[moduleIndex, orderIndex]` for deterministic question delivery
- Progress endpoint shows improvement calculation (first vs latest attempt)
- Admin endpoint has thorough validation (count checks, duplicate detection, reserved detection, moduleType matching)

**Gap**: No idempotency check in the seeding script — running it twice will fail at the name uniqueness constraint, but the error message isn't user-friendly.

### Dual-Mode Test Engine — Good ✅

The `useTestState` hook branching on `practiceTestId` is clean:
- Fixed mode: fetch-once, cache all 4 modules, serve from cache
- Random mode: fetch-per-module with used-question tracking
- Both modes converge at `completeTest()` which POSTs to `/api/test-results`

---

## 4. Testing

### Test Coverage — ❌ Missing

| Category | Status | Details |
|----------|--------|---------|
| Unit tests | ❌ None | No unit tests for any new API endpoints |
| Integration tests | ❌ None | No integration tests for reservation flow |
| E2E tests | ❌ None | No Playwright/Cypress tests for practice test UI |
| Seeding verification | ✅ Scripts | `test-practice-tests-api.ts` and `test-practice-tests-endpoints.ts` verify data |

**Required**: At minimum, unit tests for:
1. Admin create endpoint validation (reject <98 questions, duplicate questions, wrong moduleTypes)
2. Reservation integrity (publishing marks `isReserved=true`, random tests exclude reserved)
3. Attempt number calculation (first attempt = 1, subsequent increments)
4. Progress calculation (improvement percentage)

**Test coverage**: 0% (estimated). Below the 80% gate.

---

## 5. Security Review

| Check | Status | Details |
|-------|--------|---------|
| Hardcoded secrets | ✅ Pass | No secrets in code |
| SQL parameterization | ✅ Pass | Prisma handles parameterization |
| Input validation | ⚠️ Partial | Admin route uses Zod, but `[id]` params are not validated as CUID format |
| Authentication | ✅ Present | All protected endpoints check `session.user.id` |
| Authorization | ❌ **CRITICAL** | Admin endpoints (`POST /api/admin/practice-tests`, `PUT .../publish`) have **no admin role check** — any authenticated user can create/publish tests |
| OWASP Top 10 | ⚠️ | Broken Access Control (A01) — admin endpoints open to all |
| Dependencies | ✅ Pass | No new dependencies added |

### SEC-1: Missing Admin Authorization (Critical)

Both admin endpoints have this commented-out code:
```typescript
// TODO: Add proper admin role check when user roles are implemented
// if (session.user.role !== 'admin') { ... }
```

This means **any logged-in student can create and publish practice tests**, reserving arbitrary questions and potentially disrupting the random test pool. This must be addressed before production — either implement a role check, or at minimum check against a hardcoded admin email list.

---

## 6. Performance Review

| Check | Status | Details |
|-------|--------|---------|
| Async I/O | ✅ | All DB calls are async/await |
| N+1 queries | ⚠️ | List endpoint does N+1 for attempt data (`Promise.all(tests.map(async ...))`) |
| Indexes | ✅ | 5 new indexes cover the query patterns |
| Caching | ✅ | `allPracticeTestModules` caches all questions client-side |
| Memory | ✅ | 98 questions per test is small enough for client-side cache |
| Transaction safety | ✅ | Publish uses `$transaction` for atomic reservation |

### PERF-1: N+1 Query in List Endpoint (Minor)

The list endpoint (`GET /api/practice-tests`) fetches all tests, then for each test does a separate `prisma.testResult.findMany()`. For 2-10 tests this is fine, but at scale this becomes N+1. Could be optimized with a single `groupBy` query or `_count` aggregation.

### PERF-2: Detail Endpoint Loads All Questions (Info)

`GET /api/practice-tests/[id]` loads all 98 questions with image blobs (`imageData`) in a single response. For tests with many images, this could be a large payload. Consider lazy-loading images or serving them via a separate endpoint.

---

## 7. Documentation Review

| Check | Status | Details |
|-------|--------|---------|
| JSDoc on API routes | ✅ | All new routes have file-level JSDoc comments |
| Inline comments | ✅ | Clear comments on Epic #61 changes |
| ADR | ✅ | `docs/adr/ADR-61.md` documents the reservation model decision |
| Tech Spec | ✅ | `docs/specs/SPEC-61.md` is comprehensive (941 lines) |
| Completion Report | ✅ | `docs/EPIC_61_COMPLETE.md` documents all deliverables |
| README | ❌ | No README updates for practice test feature |
| Migration guide | N/A | No breaking changes |

---

## 8. Acceptance Criteria Verification

Based on the PRD requirements:

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Fixed tests with same questions every time | ✅ | `orderBy: [moduleIndex, orderIndex]` — deterministic |
| 98 questions per test (54 RW + 44 Math) | ✅ | Seeding verified: 27+27 RW, 22+22 Math |
| Reserved questions excluded from random tests | ❌ **BUG** | `/api/questions` (used by random mode) does NOT filter `isReserved` |
| Attempt tracking with improvement | ✅ | `attemptNumber` calculated, progress endpoint calculates improvement % |
| Admin create/publish workflow | ⚠️ | Works but no authorization — any user can create tests |
| Practice test selection page | ✅ | `/practice-tests` page with grid, attempt badges, scores |
| Navigation from home page | ✅ | "Practice Tests" as primary CTA on home page |
| Database seeded with 2 tests | ✅ | 196 questions reserved, 3,054 remaining |

---

## 9. Technical Debt

| Item | Priority | Description |
|------|----------|-------------|
| TD-1 | High | Admin authorization TODO — must implement before public deployment |
| TD-2 | Medium | No test suite — all endpoints untested |
| TD-3 | Medium | `getServerSession` import inconsistency across routes |
| TD-4 | Low | N+1 in list endpoint — acceptable for small test counts |
| TD-5 | Low | Seeding script not idempotent — fails on re-run without manual cleanup |

---

## 10. Compliance & Standards

| Standard | Status |
|----------|--------|
| SOLID principles | ✅ Single responsibility per file, dependency injection via Prisma |
| DRY | ⚠️ Question distribution logic is duplicated between seeding script and MODULE_CONFIGS |
| Naming conventions | ⚠️ `module` variable name shadows reserved identifier |
| Error handling | ✅ All routes have try/catch with structured error responses |
| TypeScript strict mode | ⚠️ Several `any` types and implicit `any` parameters |

---

## 11. Recommendations

### Must Fix (Before Approval)

1. **[CQ-1] Fix reservation bypass**: Add `isReserved: false` filter to `GET /api/questions` route at line 118-120 where the `where` clause is built, matching what `/api/questions/practice` already does
2. **[CQ-2] Fix duplicated JSX**: Remove lines 167-173 in `src/app/page.tsx` — this is a dangling paste artifact
3. **[SEC-1] Add admin guard**: At minimum, add an email-based allowlist check to both admin endpoints, e.g.:
   ```typescript
   const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',');
   if (!ADMIN_EMAILS.includes(session.user.email)) {
     return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
   }
   ```

### Should Fix

4. **[CQ-3] Rename `module` variable** to `mod` or `testModule` in admin create route (2 occurrences)
5. **[CQ-4] Fix Zod error property**: Change `.error.errors` to `.error.issues` in admin create route line 57
6. **[CQ-5] Standardize import**: Change `import { getServerSession } from 'next-auth'` to `from 'next-auth/next'` in all 5 new routes for consistency
7. **Add at least unit tests** for admin create validation and reservation integrity

### May Fix

8. **[CQ-6]** Prefix unused `request` parameter with underscore
9. **[CQ-7]** Replace `any` with proper Prisma types
10. **[PERF-1]** Optimize N+1 in list endpoint if planning >5 practice tests
11. **[TD-5]** Make seeding script idempotent (check-and-skip existing tests)

---

## 12. Decision

### ⚠️ CHANGES REQUESTED

**Reason**: 3 critical issues must be resolved:

1. **Reservation bypass (CQ-1)** — Random tests can serve reserved questions, defeating the core feature
2. **Malformed JSX (CQ-2)** — Home page has duplicated HTML that may render incorrectly
3. **Open admin endpoints (SEC-1)** — Any authenticated user can create/publish tests

**Path to Approval**: Fix items 1-3 above. Items 4-6 strongly recommended. Items 7-11 can be deferred to follow-up issues.

---

## 13. Next Steps

1. Engineer fixes Critical items 1-3  
2. Engineer removes `needs:changes` label  
3. Engineer moves status back to `In Review`  
4. Re-review focused on the 3 fixes + any regressions  

---

## 14. Related Issues & PRs

| Issue | Title | Status |
|-------|-------|--------|
| #61 | Epic: Fixed SAT Practice Tests | In Review |
| #62 | Database Schema Migration | Completed |
| #63 | Backend APIs | Completed |
| #65 | UI Integration | Completed |
| #66 | Attempt Tracking | Completed |
| #67 | Admin Tools | Completed |
| #68 | Database Seeding | Completed |

---

## 15. Appendix

### A. Files Reviewed (19 files, 3,552 lines added)

| File | Lines | Verdict |
|------|-------|---------|
| `prisma/schema.prisma` | +47 | ✅ Clean schema changes |
| `src/app/api/practice-tests/route.ts` | +116 | ✅ Good (minor: unused param) |
| `src/app/api/practice-tests/[id]/route.ts` | +219 | ⚠️ `any` types, works correctly |
| `src/app/api/practice-tests/[id]/progress/route.ts` | +141 | ✅ Clean |
| `src/app/api/admin/practice-tests/route.ts` | +247 | ❌ Zod bug, module shadow, no auth |
| `src/app/api/admin/practice-tests/[id]/publish/route.ts` | +126 | ⚠️ No auth check |
| `src/app/api/questions/practice/route.ts` | +420 | ✅ Correctly filters `isReserved` |
| `src/app/api/test-results/route.ts` | +16 | ✅ Clean additions |
| `src/app/page.tsx` | +32/-8 | ❌ Duplicated JSX block |
| `src/app/practice-test/page.tsx` | +9/-1 | ✅ Clean |
| `src/app/practice-tests/page.tsx` | +230 | ✅ Well-structured UI |
| `src/hooks/useTestState.ts` | +58 | ❌ Uses wrong API for random tests |
| `scripts/seed-practice-tests.ts` | +257 | ✅ Good after category fix |
| `scripts/check-categories.ts` | +56 | ✅ Diagnostic utility |
| `scripts/test-practice-tests-api.ts` | +100 | ✅ Verification script |
| `scripts/test-practice-tests-endpoints.ts` | +91 | ✅ API test script |
| `docs/adr/ADR-61.md` | +168 | ✅ Architecture decision |
| `docs/specs/SPEC-61.md` | +941 | ✅ Comprehensive specification |
| `docs/EPIC_61_COMPLETE.md` | +295 | ✅ Good completion report |

### B. Runtime Verification

```
GET /api/practice-tests         → 200 (2 tests, 98 questions each)
GET /api/practice-tests/[id]    → 401 (authentication required — correct)
Database: 196 reserved, 3,054 unreserved
Question Distribution: Verified balanced across all 4 modules
```

### C. IDE vs Runtime Errors

Many TypeScript IDE errors (e.g., `practiceTest` not on PrismaClient, `isReserved` not on QuestionSelect) are **stale type cache** issues. The Prisma generated client at `node_modules/.prisma/client/index.d.ts` confirms all models and fields exist. Runtime behavior is correct. Running `npx prisma generate` will clear these IDE errors (requires dev server restart first to release the DLL lock).

---

**Review completed**: February 19, 2026  
**Verdict**: ⚠️ CHANGES REQUESTED  
**Blocking issues**: 3 (CQ-1, CQ-2, SEC-1)  
