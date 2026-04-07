# Spec: 50 Full SAT Practice Tests

**Status**: Ready for Implementation  
**Author**: GitHub Copilot  
**Date**: 2026-04-06  

---

## 1. Context & Current State

| Metric | Value |
|--------|-------|
| Active questions in DB | **5,168** |
| Reading & Writing questions | **1,292** |
| Math questions | **3,876** |
| Published practice tests | **10** (tests 1–10, 98 questions each) |
| Reserved questions | **903** |
| Unreserved questions | **4,265** |

**A full SAT practice test = 98 questions**: 27 + 27 RW + 22 + 22 Math, across 4 modules (32 / 32 / 35 / 35 min).

---

## 2. Question Gap Analysis

### Per-test distribution (based on actual DB categories)

| Category | Module | Questions/test | ×50 tests needed | Have now | Shortfall |
|----------|--------|---------------|-----------------|----------|-----------|
| reading-comprehension | RW | 28 | 1,400 | 689 | **−711** |
| writing-language | RW | 14 | 700 | 315 | **−385** |
| vocabulary | RW | 8 | 400 | 176 | **−224** |
| grammar | RW | 4 | 200 | 112 | **−88** |
| **RW total** | | **54** | **2,700** | **1,292** | **−1,408** |
| algebra | Math | 18 | 900 | 1,675 | ✅ +775 |
| advanced-math | Math | 12 | 600 | 735 | ✅ +135 |
| problem-solving-data-analysis | Math | 10 | 500 | 737 | ✅ +237 |
| geometry | Math | 4 | 200 | 726 | ✅ +526 |
| **Math total** | | **44** | **2,200** | **3,876** | ✅ surplus |

**Verdict: Math is plentiful. Need ~1,500 new RW questions (1,408 + ~90 buffer).**

---

## 3. Step 1 — Generate ~1,500 New RW Questions

### 3.1 Targets by category

| Category | To generate | Target difficulty mix |
|----------|------------|----------------------|
| reading-comprehension | 750 | 25% easy, 50% medium, 25% hard |
| writing-language | 400 | 30% easy, 45% medium, 25% hard |
| vocabulary | 230 | 30% easy, 50% medium, 20% hard |
| grammar | 120 | 30% easy, 45% medium, 25% hard |
| **Total** | **1,500** | |

### 3.2 How to generate

Use the existing admin generation pipeline at `/admin/question-generation` (backed by `/api/admin/unified-generate`). Run in batches:

- Session the admin UI at `https://www.ducksat.com/admin/question-generation`  
- Or run the generation script directly (see `scripts/generate-rw-batch.ts` — new, to be created)
- Generate in batches of 50–100 per run to respect API rate limits
- After all 1,500 are generated, ensure `reviewStatus = 'approved'` and `isActive = true`

### 3.3 Generation script (new file: `scripts/generate-rw-batch.ts`)

The script calls `POST /api/admin/unified-generate` in a loop with:
```json
{
  "moduleType": "reading-writing",
  "category": "reading-comprehension | vocabulary | writing-language | grammar",
  "difficulty": "easy | medium | hard",
  "count": 50
}
```
Repeat until targets are met. After completion, run `node scripts/audit-questions.mjs` to verify counts.

---

## 4. Step 2 — Seed All 50 Practice Tests

### 4.1 Test tiers and difficulty profiles

| Tier | Test numbers | Difficulty profile | Target students |
|------|-------------|-------------------|----------------|
| Foundation | 1 – 10 | Easy 30% / Medium 50% / Hard 20% | Starting out, score <1100 |
| Standard | 11 – 25 | Easy 20% / Medium 55% / Hard 25% | Practicing, score 1100–1350 |
| Advanced | 26 – 50 | Easy 10% / Medium 45% / Hard 45% | Competitive, score 1350+ |

### 4.2 Module difficulty breakdown

**RW Module (27 questions)**

| Tier | Easy | Medium | Hard |
|------|------|--------|------|
| Foundation | 8 | 14 | 5 |
| Standard | 5 | 15 | 7 |
| Advanced | 3 | 12 | 12 |

**Math Module (22 questions)**

| Tier | Easy | Medium | Hard |
|------|------|--------|------|
| Foundation | 7 | 11 | 4 |
| Standard | 4 | 12 | 6 |
| Advanced | 2 | 10 | 10 |

### 4.3 Category distribution per module (fixed across all tiers)

**RW Module** (27 slots):
- reading-comprehension: 14
- writing-language: 7
- vocabulary: 4
- grammar: 2

**Math Module** (22 slots):
- algebra: 9
- advanced-math: 6
- problem-solving-data-analysis: 5
- geometry: 2

### 4.4 Uniqueness guarantee

Each question may appear in **at most one** practice test. After seeding:
- All 4,900 assigned questions get `isReserved = true`
- The remaining ~268 Math questions stay `isReserved = false` (available for drills/random tests)

### 4.5 Seeder script (new file: `scripts/seed-50-practice-tests.ts`)

Behavior:
1. **Wipe** all existing `PracticeTestQuestion` and `PracticeTest` records
2. **Unmark** all `isReserved = true` questions (fresh start)
3. Fetch full question pool, separated by module type + category + difficulty
4. Shuffle each pool
5. For each test (1–50), slice the required counts from each pool bucket, then advance the slice pointer
6. If a bucket runs dry mid-way (shouldn't happen after generation step, but as fallback): throw a descriptive error listing which category/difficulty is undersupplied
7. Insert `PracticeTest` rows with `isPublished = true`
8. Insert `PracticeTestQuestion` rows with correct `moduleIndex` (0–3) and `orderIndex`
9. Mark all used questions `isReserved = true` in a single batched update
10. Print a summary table: test name, question count by module, difficulty distribution

**Run command:**
```
npx dotenv -e .env.local -- npx tsx scripts/seed-50-practice-tests.ts
```

**Key implementation detail — deterministic ordering within a module:**
Questions within each module are sorted easy → medium → hard (mimicking real SAT adaptive structure).

### 4.6 Test naming

```
SAT Practice Test 1   (Foundation)
SAT Practice Test 2   (Foundation)
...
SAT Practice Test 10  (Foundation)
SAT Practice Test 11  (Standard)
...
SAT Practice Test 25  (Standard)
SAT Practice Test 26  (Advanced)
...
SAT Practice Test 50  (Advanced)
```

`difficulty` column values: `"foundation"` | `"standard"` | `"advanced"`

> **Backward-compatible note:** The `difficulty` column currently uses `"diagnostic"`, `"standard"`, `"advanced"`. Change `"diagnostic"` → `"foundation"` in this new seeder and update the UI pill rendering accordingly.

---

## 5. Step 3 — Plan Access & Limits

### 5.1 Which tests are visible/accessible per plan

| Plan | Tests visible | Tests playable | Monthly start limit |
|------|--------------|----------------|---------------------|
| Free | All 50 (locked UI on 2-50) | Test 1 only | 1/month |
| Monthly | All 50 unlocked | All 50 | 10/month |
| Yearly | All 50 unlocked | All 50 | 15/month |
| Tester (DUCK19) | All 50 unlocked | All 50 | Unlimited (yearly plan, `currentPeriodEnd = 2099`) |

The existing `isTestLocked(index)` code already gates by `index > 0` for free users — **no change needed to that logic**. The only update is changing the free-tier lock message to reference the test number, not just `index`.

### 5.2 Stripe plan limits (no changes for now)

`stripe-config.ts` currently has:
- free: `practiceTestsPerMonth: 1`
- monthly: `practiceTestsPerMonth: 10`
- yearly: `practiceTestsPerMonth: 15`

These limits are **per-month starts**, not a cap on which tests exist. No changes needed.

> **Future consideration:** Expose all 50 tests to monthly users with a per-month limit of 15 (to match yearly). That's a pricing decision, not a tech decision — out of scope for this spec.

---

## 6. Step 4 — UI Updates

### 6.1 Practice tests page (`src/app/practice-tests/page.tsx`)

**Add difficulty tier filter tabs** above the test grid:

```
[ All ]  [ Foundation (1–10) ]  [ Standard (11–25) ]  [ Advanced (26–50) ]
```

Filtering is client-side; no new API needed.

**Add a progress banner:**
```
You've attempted X of 50 tests · Best SAT score: 1380
```

**Card changes:**
- Add difficulty tier badge (color coded):
  - Foundation = blue
  - Standard = indigo
  - Advanced = purple/amber
- Show test number prominently (already shown via `name` field)
- Free-plan locked card: replace generic lock with a clear "Upgrade to unlock 49 more tests" CTA

**Pagination:** Not needed. 50 cards fit comfortably in a responsive 3-column grid (17 rows). Add `overflow-y: auto` scroll if needed. No server-side pagination.

### 6.2 Practice tests API (`src/app/api/practice-tests/route.ts`)

No structural changes needed. The query already returns all published tests with attempt data. With 50 tests the query will return 50 rows — acceptable performance (single indexed query).

**Optional enhancement (v2):** Add `?difficulty=foundation|standard|advanced` query param for server-side filtering.

---

## 7. Step 5 — Deploy

1. Run question generation (Step 1) — estimated 30–60 minutes using admin UI
2. Verify counts with `node scripts/audit-questions.mjs`
3. Run `seed-50-practice-tests.ts` locally (requires firewall open for 2 minutes)
4. Commit the new seeder script + UI changes
5. Run seeder against production DB via firewall temp rule
6. Build locally, verify `/practice-tests` loads 50 tests
7. Deploy to Azure (standard deploy procedure)

---

## 8. Implementation Order

| # | Task | File(s) | Time estimate |
|---|------|---------|--------------|
| 1 | Generate 1,500 RW questions | Admin UI / `scripts/generate-rw-batch.ts` (new) | 45–90 min |
| 2 | Verify question counts | `scripts/audit-questions.mjs` | 1 min |
| 3 | Write 50-test seeder | `scripts/seed-50-practice-tests.ts` (new) | 30 min |
| 4 | Run seeder against production DB | Terminal | 2 min |
| 5 | Update difficulty badge UI | `src/app/practice-tests/page.tsx` | 20 min |
| 6 | Add filter tabs + progress banner | `src/app/practice-tests/page.tsx` | 20 min |
| 7 | Update `PracticeTest.difficulty` values | Seeder handles | — |
| 8 | Build + deploy | Standard deploy | 10 min |

---

## 9. Risk Matrix

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| AI generation produces low-quality RW questions | Medium | Generation auto-sets `reviewStatus = 'approved'`; add admin review batch tool to spot-check |
| Seeder fails mid-way due to insufficient pool in one category | Low | Add pre-flight count check before seeding; throw early with clear error |
| Seeding 50 tests takes too long (DB write latency) | Low | Use `createMany` in batches of 100 rows; expected < 60s |
| Users who completed test 1–10 lose their attempt history | None | Tests are re-created but history is keyed on `practiceTestId` (old IDs → new IDs). **Wipe warning:** existing test attempts will lose their `practiceTestId` link. Mitigate by preserving old test IDs (seed new tests 11–50 only) or accepting that test history shows "unknown test" |

### 9.1 Attempt history preservation strategy (Important)

To avoid breaking existing attempt history for tests 1–10:

- **Do NOT wipe existing PracticeTest records 1–10** during seeding
- The seeder should check for existing tests by name and skip them
- Only create new tests 11–50
- Mark newly added questions as `isReserved = true` without touching the original 903 reserved questions

This means the seeder must work **incrementally**: add tests 11–50 using questions that are `isReserved = false`.

---

## 10. Testing Checklist

- [ ] After generation: `audit-questions.mjs` shows ≥1,400 reading-comprehension, ≥700 writing-language, ≥400 vocabulary, ≥200 grammar
- [ ] After seeding: DB has 50 published tests, each with exactly 98 `PracticeTestQuestion` rows
- [ ] No question appears in more than 1 test (`SELECT questionId, COUNT(*) ... HAVING COUNT(*) > 1` = 0 rows)
- [ ] Test 1–10 have `difficulty = 'foundation'` (or existing value — check if backward-compatible change is needed)
- [ ] Test 11–25 have `difficulty = 'standard'`
- [ ] Test 26–50 have `difficulty = 'advanced'`
- [ ] Free user: sees 50 tests, only test 1 is playable
- [ ] Monthly user: all 50 playable, monthly count increments on start
- [ ] `/api/practice-tests` returns all 50 tests in order
- [ ] Practice-tests page renders 50 cards without layout breakage
- [ ] Difficulty filter tabs correctly filter the grid
- [ ] Existing attempt history for tests 1–10 still shows on cards
