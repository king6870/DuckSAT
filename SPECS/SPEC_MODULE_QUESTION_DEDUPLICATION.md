# SPEC: Module Question Deduplication (Same-Type Module Overlap Fix)

**Date:** 2026-03-09  
**Status:** Implemented  
**Severity:** Bug — Critical (renders half the test meaningless)

---

## 1. Problem

When a student takes a random-mode practice test, **Module 1 and Module 2 (both reading-writing) serve the same 27 questions**, and similarly Module 3 and Module 4 (both math) overlap. This means a student only sees ~49 unique questions instead of 98.

### Root Cause

A **stale closure** in the `fetchQuestions` callback inside `useTestState.ts`:

1. Module 1 calls `fetchQuestions('reading-writing', 27)`.
2. It picks 27 questions and calls `setUsedQuestionIds(newIds)` — a React state update that won't take effect until the next render.
3. `completeModule()` immediately calls `fetchQuestions(...)` for Module 2 **within the same event loop tick**.
4. Because `fetchQuestions` captures `usedQuestionIds` from the closure at definition time, Module 2 still sees the **old empty array** — so the dedup filter excludes nothing.
5. The API returns questions in deterministic `createdAt DESC` order, so Module 2 receives and selects the exact same questions.

### Contributing Factors

- **No server-side exclusion:** The `/api/questions` endpoint had no `exclude` parameter, so every fetch for the same `moduleType` and `limit` returned the same result set.
- **No shuffle:** Questions were served and consumed in the same deterministic order, eliminating any randomness that might have masked the overlap.

---

## 2. Solution

Three-layer defense against duplicate questions:

### Layer 1 — `useRef` for Used IDs (client)

| Before | After |
|--------|-------|
| `usedQuestionIds` tracked only via `useState` | Added `usedQuestionIdsRef = useRef<string[]>([])` that is always kept in sync |
| `fetchQuestions` read from stale `usedQuestionIds` closure | `fetchQuestions` reads from `usedQuestionIdsRef.current` — always up-to-date |

This eliminates the stale-closure root cause. The ref is updated synchronously right after computing the new used-IDs set, so it's immediately visible to the next `fetchQuestions` call regardless of React render timing.

### Layer 2 — Server-side `exclude` parameter (API)

**File:** `src/app/api/questions/route.ts`

Added support for an `exclude` query parameter:

```
GET /api/questions?moduleType=reading-writing&limit=81&exclude=id1,id2,id3,...
```

The API adds a `{ id: { notIn: excludeIds } }` clause to the Prisma `where` filter so excluded questions never leave the database in the response.

### Layer 3 — Client-side shuffle (client)

**File:** `src/hooks/useTestState.ts`

After filtering, the remaining questions are shuffled (Fisher-Yates) before slicing to `limit`. This ensures that even if the API returns the same pool, different modules get different random subsets.

---

## 3. Files Changed

| File | Change |
|------|--------|
| `src/hooks/useTestState.ts` | Added `useRef` import; created `usedQuestionIdsRef`; `fetchQuestions` reads from ref instead of state; ref updated synchronously; shuffle before slice; ref cleared in `abandonTest()`; `usedQuestionIds` removed from dependency array |
| `src/app/api/questions/route.ts` | Added `exclude` query param parsing; adds `id: { notIn: [...] }` to Prisma where clause |

---

## 4. Behavior Matrix

| Scenario | Before | After |
|----------|--------|-------|
| Module 1 → Module 2 (same moduleType) | Identical questions | Completely different questions |
| Module 3 → Module 4 (same moduleType) | Identical questions | Completely different questions |
| Very small question pool (< 2× module size) | Would have overlapped silently | Excludes as many as possible; warns "allowing some repeats" in console if forced |
| Fixed practice test mode (`practiceTestId`) | Unaffected (uses pre-assigned per-module questions) | Unaffected — no change to that code path |
| Abandon + restart | Used IDs accumulate from prior attempt | `usedQuestionIdsRef` is cleared, fresh start |

---

## 5. Test Plan

| # | Test | Expected |
|---|------|----------|
| 1 | Start random test, complete Module 1 R&W, enter Module 2 R&W | Zero question overlap between modules |
| 2 | Complete Module 3 Math, enter Module 4 Math | Zero question overlap |
| 3 | Check browser console for fetch logs | Module 2 URL includes `&exclude=...` with Module 1 IDs |
| 4 | Small question pool: seed DB with only 30 R&W questions | Module 1 gets 27, Module 2 gets remaining 3 unique + 24 repeats; console warns "allowing some repeats" |
| 5 | Abandon test and restart | New test gets fresh questions (ref cleared) |
| 6 | Fixed practice test (with `practiceTestId`) | Still works — questions come from cached modules, not random fetch |
