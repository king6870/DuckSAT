# PRACTICE TEST READING-FIRST ORDERING SPEC

## 1) Objective
Guarantee deterministic practice test sequencing such that:
1. Reading/Writing modules always appear first.
2. Math modules always appear after Reading/Writing.
3. Database `orderIndex` reflects this sequence.

## 2) Ordering Contract
Canonical module sequence:
- Module 0: Reading/Writing (first half)
- Module 1: Reading/Writing (second half)
- Module 2: Math (first half)
- Module 3: Math (second half)

Canonical retrieval order:
- Sort by `moduleIndex ASC`, then `orderIndex ASC`.

## 3) Invariants
For each `practiceTestId`:
- `orderIndex` must be strictly increasing over the full test.
- Module index sequence in `orderIndex` traversal must be non-decreasing.
- Module-type mapping must hold:
  - `0,1 => reading-writing`
  - `2,3 => math`

## 4) Implemented Changes
## 4.1 Future test creation
File: `src/app/api/admin/practice-tests/route.ts`
- Before writing `practice_test_questions`, modules are sorted by `moduleIndex`.
- `orderIndex` assignment is applied in sorted order, ensuring Reading modules are persisted before Math modules.

## 4.2 Existing test normalization
File: `scripts/repair-practice-test-module-types.ts`
- Rewrites existing `practice_test_questions` by grouping questions by `question.moduleType`.
- Reassigns `moduleIndex` and `orderIndex` in canonical sequence:
  - all reading-writing (split across 0/1)
  - then all math (split across 2/3)

## 4.3 Ordering verification
File: `scripts/verify-practice-test-ordering.ts`
- Checks:
  - module-type mapping validity
  - strict `orderIndex` monotonicity
  - non-decreasing `moduleIndex` along `orderIndex`

## 5) Data Caveat
If a test has zero Reading/Writing questions, canonical reading-first structure cannot be fully realized in content terms; ordering still remains valid and deterministic (Math in modules 2/3). Publish-time guard blocks incomplete tests from being newly published.

## 6) Acceptance Criteria
1. New practice tests are persisted in canonical module order regardless of request array order.
2. Existing tests can be normalized via repair script.
3. Verification script reports zero ordering violations.
4. API retrieval shows Reading modules first whenever Reading content exists.

## 7) Operational Commands
- Normalize existing data:
  - `npx dotenv -e .env.local -- tsx scripts/repair-practice-test-module-types.ts`
- Verify ordering:
  - `npx dotenv -e .env.local -- tsx scripts/verify-practice-test-ordering.ts`

## 8) Follow-ups
- Keep publish guard enabled to prevent incomplete module sets from going live.
- Optionally add strict count enforcement (`27/27/22/22`) in publish gate for production releases.
