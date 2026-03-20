# SPEC: Seed 8 Fixed SAT Practice Tests

## Overview
A single TypeScript seed script (`scripts/seed-8-practice-tests.ts`) that creates 8 practice tests in the database with 784 globally unique questions. Runs via `npx dotenv -e .env.local -- npx tsx scripts/seed-8-practice-tests.ts`.

## Data Model (existing — no schema changes)

```
PracticeTest
├── id: String (cuid)
├── name: String (unique) — "SAT Practice Test 1" … "SAT Practice Test 8"
├── description: String
├── difficulty: "standard"
├── isPublished: true
└── questions: PracticeTestQuestion[]

PracticeTestQuestion
├── practiceTestId → PracticeTest.id
├── questionId → Question.id
├── moduleIndex: Int (0=RW1, 1=RW2, 2=Math1, 3=Math2)
└── orderIndex: Int (0–97 global position within test)

Question.isReserved = true  (for all 784 assigned questions)
```

## Algorithm

### Step 1 — Load Question Pool
```sql
SELECT id, moduleType, difficulty
FROM questions
WHERE isActive = true
ORDER BY moduleType, difficulty, NEWID()
```
Split into two pools: `rwPool[]` and `mathPool[]`.

### Step 2 — Identify Existing Tests
Query `PracticeTest` for "SAT Practice Test 1" through "SAT Practice Test 8".
- If a test exists with questions assigned → skip (preserve existing assignments)
- If a test exists with 0 questions → assign new questions
- If a test doesn't exist → create it, then assign questions

### Step 3 — Collect Already-Reserved Question IDs
```sql
SELECT DISTINCT questionId FROM practice_test_questions
WHERE practiceTestId IN (existing test IDs)
```
Add to `usedQuestionIds: Set<string>` to prevent cross-test duplicates.

### Step 4 — For Each New Test (tests 3–8, or whichever need filling)
1. **Separate available pools** — exclude `usedQuestionIds` from each pool
2. **Sort by difficulty** within each pool (easy → medium → hard, shuffled within tier)
3. **Pick R&W questions** (54 per test):
   - Target mix: ~16 easy, ~27 medium, ~11 hard (adjustable)
   - Randomly select from each difficulty tier
   - Split 54 into: 27 for moduleIndex=0, 27 for moduleIndex=1
4. **Pick Math questions** (44 per test):
   - Target mix: ~13 easy, ~22 medium, ~9 hard
   - Randomly select from each difficulty tier
   - Split 44 into: 22 for moduleIndex=2, 22 for moduleIndex=3
5. **Create `PracticeTestQuestion` records**:
   - `orderIndex` = sequential 0–97 (0–26 for RW1, 27–53 for RW2, 54–75 for Math1, 76–97 for Math2)
   - Within each module, order: easy first, medium, hard last
6. **Mark questions as reserved**: `UPDATE questions SET isReserved=true WHERE id IN (...)`
7. **Add picked IDs to `usedQuestionIds`**

### Step 5 — Verify Integrity
After all 8 tests:
- Assert total unique question IDs = 784 (8 × 98)
- Assert each test has exactly 98 `PracticeTestQuestion` rows
- Assert no question ID appears in more than one test
- Print summary table

## Difficulty Distribution Per Module

### R&W Modules (27 questions each)
| Difficulty | Target | % |
|-----------|--------|---|
| Easy | 8 | 30% |
| Medium | 14 | 52% |
| Hard | 5 | 18% |

### Math Modules (22 questions each)
| Difficulty | Target | % |
|-----------|--------|---|
| Easy | 7 | 32% |
| Medium | 11 | 50% |
| Hard | 4 | 18% |

### Budget Check (all 8 tests)
| | Easy needed | Easy avail | Med needed | Med avail | Hard needed | Hard avail |
|---|---|---|---|---|---|---|
| R&W (8 tests × 2 modules × per-module) | 128 | 315 ✅ | 224 | 882 ✅ | 80 | 199 ✅ |
| Math (8 tests × 2 modules × per-module) | 112 | 1,248 ✅ | 176 | 2,036 ✅ | 64 | 794 ✅ |

All tiers have sufficient headroom.

## PracticeTest Records

| # | Name | Difficulty | Published |
|---|------|-----------|-----------|
| 1 | SAT Practice Test 1 | standard | true |
| 2 | SAT Practice Test 2 | standard | true |
| 3 | SAT Practice Test 3 | standard | true |
| 4 | SAT Practice Test 4 | standard | true |
| 5 | SAT Practice Test 5 | standard | true |
| 6 | SAT Practice Test 6 | standard | true |
| 7 | SAT Practice Test 7 | standard | true |
| 8 | SAT Practice Test 8 | standard | true |

## orderIndex Mapping
```
orderIndex  0–26  → moduleIndex 0 (RW Module 1, 27 questions)
orderIndex 27–53  → moduleIndex 1 (RW Module 2, 27 questions)
orderIndex 54–75  → moduleIndex 2 (Math Module 1, 22 questions)
orderIndex 76–97  → moduleIndex 3 (Math Module 2, 22 questions)
```

## Script Output (expected)
```
=== Seed 8 Practice Tests ===
Question pool: 1396 R&W, 4078 Math
Existing tests: 2 (196 questions reserved)

[Test 1] SAT Practice Test 1 — SKIP (already has 98 questions)
[Test 2] SAT Practice Test 2 — SKIP (already has 98 questions)
[Test 3] SAT Practice Test 3 — CREATED: 54 R&W + 44 Math = 98 questions
[Test 4] SAT Practice Test 4 — CREATED: 54 R&W + 44 Math = 98 questions
[Test 5] SAT Practice Test 5 — CREATED: 54 R&W + 44 Math = 98 questions
[Test 6] SAT Practice Test 6 — CREATED: 54 R&W + 44 Math = 98 questions
[Test 7] SAT Practice Test 7 — CREATED: 54 R&W + 44 Math = 98 questions
[Test 8] SAT Practice Test 8 — CREATED: 54 R&W + 44 Math = 98 questions

✅ Verification passed:
   Total questions assigned: 784
   Unique question IDs: 784 (no duplicates)
   All 8 tests published and ready
```

## Rollback
If needed, the script can be reversed:
1. Delete `PracticeTestQuestion` rows for tests 3–8
2. Set `isReserved = false` on those questions
3. Delete `PracticeTest` rows for tests 3–8

## Files Changed
| File | Change |
|------|--------|
| `scripts/seed-8-practice-tests.ts` | NEW — seed script |
| `prd/PRD-8-practice-tests.md` | NEW — PRD |
| `SPECS/SPEC-8-practice-tests.md` | NEW — this spec |

No schema changes. No API changes. No UI changes (existing practice-tests page auto-lists all published tests).
