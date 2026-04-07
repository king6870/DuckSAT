# SPEC: 50 Practice Tests — Plan Gating & UX
**Date:** 2026-04-06  
**Status:** Implementation-ready

---

## 1. Goals

1. All 50 practice tests appear in the listing for every user (no hidden tests).
2. Access is gated by plan tier, enforced **both client-side (UX) and server-side (API)**.
3. Monthly plan gets 10 practice test starts per calendar month.
4. Yearly plan gets 15 practice test starts per calendar month.
5. Free plan: 1 test start per month (only the first free-access test, Test 1, is unlocked by plan).
6. Testers (`isTester = true`) get unlimited access (same as yearly, effectively Infinity).
7. Usage resets on the 1st of each calendar month (UTC).
8. A "test start" = the `/api/practice-tests/[id]/start` endpoint is called, which increments usage.
9. Retaking the same test within the same month counts as another start.

---

## 2. Plan Limits (already correct in stripe-config.ts)

| Plan | Tests/month | Drills/month |
|---|---|---|
| free | 1 | 3 |
| monthly | 10 | ∞ |
| yearly | 15 | ∞ |

No changes needed to `stripe-config.ts`.

---

## 3. Architecture

### 3.1 New API Route: `POST /api/practice-tests/[id]/start`

This is the **single enforcement point**. The practice-test runner calls this before loading questions. It:
1. Authenticates the user (401 if not logged in).
2. Looks up effective plan via `getEffectivePlan`.
3. Calls `checkUsageLimit(userId, 'practice_test')`.
4. If NOT allowed → returns `{ allowed: false, used, limit, resetDate }` with HTTP 429.
5. If allowed → calls `incrementUsage(userId, 'practice_test')` then returns `{ allowed: true }`.

### 3.2 Free-plan access lock (client-side display)

Free users see tests 2–50 with a **plan lock overlay** (the existing "Upgrade to Unlock" overlay).  
Free users who ARE within their 1/month limit can start Test 1 via the usage path.  
This is a UX hint only — the server enforces independently.

**Logic change:** Instead of `isTestLocked(index)` using the array index (fragile), use the test `name` field to determine if it's "SAT Practice Test 1" — or use the `difficulty` field (foundation tests are free-access).

Actually simpler: keep the index-based lock for display, but gate by **test number** extracted from the name string. Tests 2–50 are plan-locked for free users (must upgrade). Test 1 is usage-gated.

### 3.3 Monthly usage limit lock (client-side display)

For paid users who have hit their monthly cap (`testsRemaining <= 0`), show an "Monthly Limit Reached" badge instead of the Start button. This already exists — just needs cleanup.

### 3.4 `useTestState` hook change

When `startTest` is called, before loading questions, call `POST /api/practice-tests/[id]/start`. If it returns 429 → surface the error. If 200 → proceed normally.

---

## 4. Files to Change

| File | Change |
|---|---|
| `src/app/api/practice-tests/[id]/start/route.ts` | **CREATE** — new start endpoint |
| `src/hooks/useTestState.ts` | Call `/start` before `fetchQuestions` |
| `src/app/practice-tests/page.tsx` | Fix lock logic + improve messaging |
| `src/app/pricing/page.tsx` | Show correct test counts per plan (already shows limits, review copy) |

**No schema changes needed** — `UsageRecord` already exists.

---

## 5. Detailed Implementation

### 5.1 `POST /api/practice-tests/[id]/start`

```typescript
// Returns:
// 200: { allowed: true, used: number, limit: number }
// 429: { allowed: false, used: number, limit: number, resetDate: string, message: string }
// 401: { error: 'Unauthorized' }
// 404: { error: 'Test not found' }
```

Logic:
```
1. session → 401 if missing
2. practiceTest = findUnique({ id, isPublished: true }) → 404 if missing
3. effectivePlan = getEffectivePlan(user)
4. if isTester → skip limit check, increment, return { allowed: true }
5. { allowed, used, limit } = checkUsageLimit(userId, 'practice_test')
6. if !allowed → return 429 with reset date (1st of next month UTC)
7. incrementUsage(userId, 'practice_test')
8. return 200 { allowed: true, used: used+1, limit }
```

### 5.2 `useTestState.ts` — `startTest()` change

Before calling `fetchQuestions`, add:
```typescript
if (practiceTestId) {
  const startRes = await fetch(`/api/practice-tests/${practiceTestId}/start`, { method: 'POST' })
  if (startRes.status === 429) {
    const body = await startRes.json()
    throw new Error(body.message || 'Monthly practice test limit reached. Upgrade your plan or wait for reset.')
  }
  if (!startRes.ok) {
    throw new Error('Failed to start practice test. Please try again.')
  }
}
```

### 5.3 `practice-tests/page.tsx` — Lock logic fix

Replace `isTestLocked(index: number)` with a function based on the test object:

```typescript
function isTestPlanLocked(test: PracticeTest): boolean {
  if (!isFree) return false
  // Free plan: only SAT Practice Test 1 is accessible
  return test.name !== 'SAT Practice Test 1'
}
```

Update the card render to use `isTestPlanLocked(test)` instead of `isTestLocked(globalIndex)`.

Also improve the "Monthly Limit Reached" message to include reset date:
```
Monthly Limit Reached (resets {month+1}/1)
```

### 5.4 Pricing page — feature list copy

Ensure the plan cards clearly state:
- Free: "1 practice test per month"
- Monthly: "10 practice tests per month"  
- Yearly: "15 practice tests per month"

---

## 6. Edge Cases

| Case | Behavior |
|---|---|
| Tester user (`isTester=true`) | Skip ALL gating, always allowed |
| User retakes same test same month | Counts as a new start, decrements remaining |
| User on free plan tries Test 2 | Plan-lock overlay shown; server returns 403 if bypassed (we'll add plan check in /start too) |
| Yearly plan, 15/15 used | 429 returned, "Upgrade or wait for reset" message |
| Unauthenticated user hits /start | 401 returned |
| Test not published | 404 returned |

---

## 7. What Does NOT Change

- `stripe-config.ts` — already correct
- `subscription.ts` — `checkUsageLimit` and `incrementUsage` are correct, just unused
- `GET /api/practice-tests` — listing route stays the same
- `GET /api/practice-tests/[id]` — question fetching stays the same
- Seeder script — already correct
- Tier filter UI — already implemented

---

## 8. Implementation Order

1. Create `POST /api/practice-tests/[id]/start/route.ts`
2. Update `useTestState.ts` to call `/start`
3. Update `practice-tests/page.tsx` lock logic
4. Verify zero TypeScript errors
5. Run seeder when generation finishes
6. Build + deploy
