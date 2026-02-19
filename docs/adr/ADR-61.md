# ADR-61: Fixed SAT Practice Tests Architecture

**Status**: Accepted  
**Date**: 2026-02-19  
**Author**: Solution Architect Agent  
**Epic**: #61  
**PRD**: [PRD-FIXED-PRACTICE-TESTS.md](../prd/PRD-FIXED-PRACTICE-TESTS.md)

---

## Table of Contents

1. [Context](#context)
2. [Decision](#decision)
3. [Options Considered](#options-considered)
4. [Rationale](#rationale)
5. [Consequences](#consequences)
6. [Implementation](#implementation)
7. [References](#references)

---

## Context

The platform currently generates random test sessions by fetching questions from `/api/questions` with no deterministic ordering. The `useTestState` hook picks questions dynamically per module. There is no concept of a "named test" that a student can retake with identical content.

**Requirements (from PRD #61):**
- Named practice tests ("SAT Practice Test 1", etc.) with fixed question sets
- Exact same questions in exact same order on every attempt
- Questions reserved for fixed tests MUST NOT appear in random/adaptive tests
- Track multiple attempts per practice test per user with scoring history
- Admin workflow to create/publish tests and reserve questions
- Launch with 2 practice tests (98 questions each: 27+27 RW, 22+22 Math)

**Constraints:**
- SQL Server (Prisma ORM) — no PostgreSQL-specific features
- Existing `TestResult` and `QuestionResult` models must remain backward-compatible (nullable new fields)
- Current question pool ≈1,308 — reserving 196 (2 × 98) leaves ≈1,112 for random tests
- Zero-downtime migration required (production database in use)
- Module structure is 4 fixed modules: RW-1 (27q/32m), RW-2 (27q/32m), Math-1 (22q/35m), Math-2 (22q/35m)

**Background:**
The `useTestState` hook currently calls `/api/questions?moduleType=X&limit=N` and slices a random subset. For fixed tests, the hook must instead fetch a deterministic, ordered question set from a new API endpoint. The existing random test path must remain unchanged.

---

## Decision

We will implement a **join-table reservation model** where:

1. A new `PracticeTest` model stores test metadata (name, difficulty, published status).
2. A new `PracticeTestQuestion` join table maps questions to tests with a fixed `orderIndex` and a `moduleIndex` (0–3) to assign each question to its specific SAT module.
3. A new `isReserved` boolean on the `Question` model excludes reserved questions from random test queries.
4. The existing `TestResult` model gains nullable `practiceTestId` and `attemptNumber` columns for backward-compatible attempt tracking.
5. A new `/api/practice-tests` API serves both the test catalog and fixed question sets.
6. The existing `useTestState` hook gains a `practiceTestId` mode that fetches ordered questions from the new API instead of random ones.

---

## Options Considered

### Option A: Join-Table Reservation Model (Selected)

**Description:** Separate `PracticeTest` and `PracticeTestQuestion` tables. Questions link to tests via join rows with `orderIndex` and `moduleIndex`. An `isReserved` flag on `Question` excludes reserved questions from random pools.

| Aspect | Assessment |
|--------|------------|
| **Flexibility** | HIGH — Supports N tests, per-module ordering, future versioning |
| **Query Performance** | HIGH — Single JOIN query with `ORDER BY orderIndex` returns deterministic set |
| **Data Integrity** | HIGH — Unique constraints prevent duplicate questions per test and per order slot |
| **Migration Risk** | LOW — Additive schema change (new tables + one nullable boolean + two nullable columns) |
| **Complexity** | MEDIUM — New tables plus updates to existing query paths |

### Option B: JSON Configuration in Question Tags

**Description:** Encode practice test assignments in the existing `tags` JSON field on `Question` (e.g., `["practice-test-1", "order:5"]`). No new tables.

| Aspect | Assessment |
|--------|------------|
| **Flexibility** | LOW — Parsing tags is fragile, no database-level ordering guarantee |
| **Query Performance** | LOW — Must parse JSON strings, cannot `ORDER BY` a JSON field in SQL Server |
| **Data Integrity** | LOW — No unique constraints, duplicate-prevention requires application logic |
| **Migration Risk** | LOW — No schema changes |
| **Complexity** | HIGH — Complex query parsing, error-prone maintenance |

### Option C: Static JSON Seed Files

**Description:** Store practice test definitions as JSON files in the repo (`seeds/practice-test-1.json`). At runtime, read question IDs from file and bulk-fetch from database.

| Aspect | Assessment |
|--------|------------|
| **Flexibility** | MEDIUM — Easy to edit files, but no admin UI or dynamic creation |
| **Query Performance** | MEDIUM — Bulk `findMany({ where: { id: { in: [...] } } })` is fast but loses ordering |
| **Data Integrity** | LOW — No DB-level enforcement; files can reference deleted questions |
| **Migration Risk** | NONE — No schema changes |
| **Complexity** | LOW — Simplest to implement initially, but cannot scale to admin features |

---

## Rationale

**Option A (Join-Table) is selected** because it:

1. **Guarantees deterministic ordering** via `orderIndex` — a SQL `ORDER BY` always returns questions in the same sequence, fulfilling the core PRD requirement.
2. **Provides database-level integrity** — unique constraints `(practiceTestId, orderIndex)` and `(practiceTestId, questionId)` prevent configuration errors at the storage layer.
3. **Enables performant exclusion** — adding `WHERE isReserved = false` to the existing random test query is a single indexed boolean filter, costing ~0ms overhead.
4. **Supports future admin UI** — the relational model is directly queryable, paginatable, and compatible with a CRUD admin interface (Feature #67).
5. **Preserves backward compatibility** — all schema changes are additive (new tables, nullable columns) with no breaking changes to existing models or APIs.
6. **Introduces `moduleIndex`** — this maps each question to its specific SAT module (0=RW-1, 1=RW-2, 2=Math-1, 3=Math-2), allowing the API to serve per-module question slices that align with the existing `MODULE_CONFIGS` array.

Option B was rejected because JSON tag parsing cannot guarantee deterministic ordering in SQL Server and would require complex application-level enforcement. Option C was rejected because static files cannot support admin test creation (Feature #67) and provide no referential integrity.

---

## Consequences

### Positive
- Students get identical questions on retakes — the core user need is met
- Random test pool remains uncontaminated — `isReserved` filter is simple and indexed
- Attempt tracking enables improvement analytics — measurable student progress
- Schema is extensible for future features (timed sections, adaptive Module 2, test versioning)
- Module-aware ordering aligns with existing `MODULE_CONFIGS` structure

### Negative
- 196 questions reserved per 2 tests reduces random pool from 1,308 to ≈1,112 (15% reduction)
- New migration adds 2 tables and 3 columns — requires coordinated deploy
- `useTestState` hook grows more complex with dual-mode (random vs. fixed) question fetching
- Admin must manually balance question distribution when creating tests

### Neutral
- No change to existing `TestResult` data or API for random tests
- Seeding scripts must run after migration but before launch
- Performance impact negligible (one boolean filter + one JOIN)

---

## Implementation

Implementation is fully specified in [SPEC-61.md](../specs/SPEC-61.md).

**Summary of phases:**

| Phase | Features | Duration |
|-------|----------|----------|
| 1. Foundation | Schema migration (#62), API endpoints (#63) | Weeks 1–2 |
| 2. Core UX | Test-taking UI (#65), Attempt tracking (#66) | Weeks 3–4 |
| 3. Content | Admin tools (#67), Seed Tests 1 & 2 (#68) | Weeks 5–6 |
| 4. QA/Launch | E2E testing, performance tuning | Week 7 |

**Migration strategy:** Additive-only (no column drops, no type changes). Deploy Prisma migration during low-traffic window. All new columns are nullable or have defaults, so no data backfill is needed.

---

## References

- **PRD**: [docs/prd/PRD-FIXED-PRACTICE-TESTS.md](../prd/PRD-FIXED-PRACTICE-TESTS.md)
- **Tech Spec**: [docs/specs/SPEC-61.md](../specs/SPEC-61.md)
- **Current Schema**: [prisma/schema.prisma](../../prisma/schema.prisma)
- **Current Practice API**: [src/app/api/questions/practice/route.ts](../../src/app/api/questions/practice/route.ts)
- **Test Hook**: [src/hooks/useTestState.ts](../../src/hooks/useTestState.ts)
- **Module Configs**: [src/data/moduleConfigs.ts](../../src/data/moduleConfigs.ts)
- **Test Types**: [src/types/test.ts](../../src/types/test.ts)
- **Epic**: [GitHub Issue #61](https://github.com/king6870/DuckSAT/issues/61)

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-19
