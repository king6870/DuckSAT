# PRACTICE TEST CANONICAL ORDER REPAIR SPEC

## 1) Goal
Ensure every published practice test always starts with Reading/Writing modules and then Math modules, with database ordering aligned to this sequence.

Canonical structure per test:
- Module 0: Reading/Writing (27)
- Module 1: Reading/Writing (27)
- Module 2: Math (22)
- Module 3: Math (22)

Total: 98 questions.

## 2) Problem
Published tests had incomplete and mis-sequenced data (Math-only modules), causing tests to start on Math and breaking expected SAT module flow.

## 3) Requirements
1. Reading modules must always come first.
2. DB `moduleIndex` and `orderIndex` must reflect reading-first sequence.
3. Existing published tests must be repaired in-place.
4. Future tests must persist in canonical order.

## 4) Implementation
### 4.1 Future creation ordering
File: `src/app/api/admin/practice-tests/route.ts`
- Sort incoming modules by `moduleIndex` before writing `practice_test_questions`.
- Assign `orderIndex` in sorted sequence.

### 4.2 Existing published tests repair
File: `scripts/repair-practice-tests-canonical-order.ts`
- For each published test:
  - Read current assigned questions.
  - Keep existing reading/math where possible.
  - Backfill missing reading/math from active, unreserved pool.
  - Rebuild assignments to exact canonical counts.
  - Rewrite `moduleIndex` and `orderIndex` in reading-first order.
- Sync `question.isReserved` to questions used by published tests.

### 4.3 Verification
Files:
- `scripts/verify-practice-test-ordering.ts`
- `scripts/validate-publish-guard-readiness.ts`
- `scripts/check-practice-test-module-counts.ts`

Expected outcome:
- `moduleCounts = {0:27,1:27,2:22,3:22}`
- zero ordering violations
- publish guard status `READY`

## 5) Operational Commands
- Repair:
  - `npx dotenv -e .env.local -- tsx scripts/repair-practice-tests-canonical-order.ts`
  - or `npm run repair:practice-test-canonical-order` (with env configured)
- Validate:
  - `npx dotenv -e .env.local -- npm run validate:practice-test-ordering`
  - `npx dotenv -e .env.local -- npm run validate:practice-test-publish-guard`

## 6) Acceptance Criteria
1. Starting any published practice test begins on Reading/Writing module.
2. DB module counts per published test equal `27/27/22/22`.
3. Ordering validator reports no violations.
4. Publish guard reports `READY` for repaired tests.

## 7) Risks and Mitigations
- Risk: Added questions may change test composition unexpectedly.
  - Mitigation: deterministic ordering and strict module count validation.
- Risk: question reservation drift.
  - Mitigation: reservation synchronization step in repair script.
