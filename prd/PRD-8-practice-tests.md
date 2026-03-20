# PRD: Seed 8 Fixed SAT Practice Tests

## Problem Statement
DuckSAT currently has only 2 published practice tests (98 questions each) out of a pool of 5,474 active questions. Students completing both tests have no new fixed-form practice material. The user requests 8 total practice tests with unique, non-repeating questions, reading modules first, math modules second.

## Objective
Create 8 fixed-form SAT practice tests (6 new + keep 2 existing) in the database, each containing 98 unique questions with zero overlap across all 8 tests. All tests follow the official Digital SAT structure.

## Current State
| Metric | Value |
|--------|-------|
| Total active questions | 5,474 |
| Reading & Writing (R&W) | 1,396 (315 easy / 882 medium / 199 hard) |
| Math | 4,078 (1,248 easy / 2,036 medium / 794 hard) |
| Currently reserved | 120 (across 2 existing tests) |
| Existing practice tests | 2 (published, 98 questions each) |

## Requirements

### R1 — 8 Unique Practice Tests
- 8 total practice tests: "SAT Practice Test 1" through "SAT Practice Test 8"
- Keep existing 2 tests and their question assignments intact
- Create 6 new tests with fresh question assignments
- Every question used across all 8 tests must be globally unique (no question appears in more than one test)

### R2 — Digital SAT Module Structure (per test)
Each test follows the official Digital SAT format:
| Module | Index | Type | Questions | Time |
|--------|-------|------|-----------|------|
| RW Module 1 | 0 | reading-writing | 27 | 32 min |
| RW Module 2 | 1 | reading-writing | 27 | 32 min |
| Math Module 1 | 2 | math | 22 | 35 min |
| Math Module 2 | 3 | math | 22 | 35 min |
| **Total** | | | **98** | **134 min** |

Reading & Writing modules (index 0, 1) must come first; Math modules (index 2, 3) come after.

### R3 — Difficulty Distribution
Each module should aim for a balanced mix:
- ~30% easy, ~50% medium, ~20% hard (flexible based on availability)
- R&W pool is tighter (1,396 total for 432 needed = 3.2× headroom)
- Math pool is abundant (4,078 total for 352 needed = 11.6× headroom)

### R4 — Question Reservation
- All 784 questions assigned to the 8 tests must have `isReserved = true`
- Reserved questions are excluded from random/drill question pools
- Remaining ~4,690 unreserved questions stay available for drills

### R5 — Database Records
- Use existing `PracticeTest` and `PracticeTestQuestion` models
- Each `PracticeTestQuestion` has `moduleIndex` (0-3) and `orderIndex` (0-97)
- Questions ordered within each module by difficulty: easy → medium → hard
- All 8 tests set `isPublished = true`

## Question Budget
| | R&W Needed | Math Needed | Total |
|---|---|---|---|
| Per test | 54 | 44 | 98 |
| 8 tests | 432 | 352 | 784 |
| Available | 1,396 | 4,078 | 5,474 |
| Surplus | 964 | 3,726 | 4,690 |

## Success Criteria
1. 8 published practice tests visible on `/practice-tests` page
2. 784 unique questions across all tests, zero duplicates
3. Each test: 54 R&W questions (modules 0-1) + 44 Math questions (modules 2-3)
4. Module order: Reading first, Math second (matching existing `MODULE_CONFIGS`)
5. All assigned questions marked `isReserved = true`
6. Existing test results and user data unaffected
7. Script is idempotent — can re-run without creating duplicates

## Out of Scope
- Adaptive module 2 difficulty (static assignment for now)
- New question generation
- UI changes (existing `/practice-tests` page already lists all published tests)
