# PRD: Codebase Error Remediation

## Document Info
- Date: 2026-03-04
- Owner: Engineering
- Scope: Entire DuckSAT workspace

## Problem Statement
Current workspace diagnostics show compile/lint/runtime issues across TypeScript config, scripts, notebooks, and generated JSON. These issues increase deployment risk, reduce developer velocity, and hide regressions.

## Goals
1. Establish a clean, actionable error baseline across the whole repo.
2. Prioritize fixes by production impact.
3. Eliminate critical TypeScript and API-adjacent errors first.
4. Isolate non-production artifacts (notebooks/generated files) from blocking developer workflows.

## Non-Goals
- Full refactor of all legacy scripts in one pass.
- Rewriting notebooks for production quality.
- Data regeneration of all historical generated JSON unless required.

## Current Error Inventory (Baseline)
### A) High Priority (Core code/config)
1. `prisma.config.ts`
   - `defineConfig` imported from `@prisma/client` but not exported.

2. `scripts/append-to-practice-tests.ts`
   - Invalid typing around `dbResult` (`{}` type used like array).
   - Missing `Question` type declaration.

### B) Medium Priority (legacy JS scripts under strict lint)
3. `scripts/import_generated_questions.js`
   - `require()` style import forbidden.

4. `scripts/append-to-practice-tests.js`
   - `require()` style import forbidden.

### C) Low Priority / Non-Prod Artifacts
5. Notebook cell errors:
   - undefined symbols in `question-generation/real_question_generator.ipynb`
   - syntax bug in `reading_writing_question_generator.ipynb` (`", ",join(...)`).

6. Data file issue:
   - `generated-questions/reading_batch.json` has unterminated string (invalid JSON payload).

## User Stories
- As an engineer, I can run diagnostics and trust failures to represent real production risks.
- As a maintainer, I can distinguish blocking code errors from notebook/data artifacts.
- As a release owner, I can gate deployment on critical error classes only.

## Functional Requirements
1. Produce categorized error report with path-level granularity.
2. Define priority levels and remediation order.
3. Define acceptance criteria per priority bucket.
4. Create implementation spec with concrete file-level tasks.

## Acceptance Criteria
- A PRD exists with complete baseline inventory and priorities.
- A SPEC exists with implementable tasks and verification steps.
- High-priority fixes are clearly listed and testable.
- Error classes from notebooks/generated data are explicitly scoped.

## Milestones
1. Baseline inventory complete ✅
2. PRD + SPEC published ✅
3. Phase 1 fixes (core code/config) pending
4. Phase 2 fixes (legacy script lint) pending
5. Phase 3 cleanup (notebooks/generated data) pending

## Risks
- Fixing lint rules globally may break legacy script workflows.
- Invalid generated JSON may indicate upstream generator defects.
- Notebook errors may be environment-state dependent.

## Success Metrics
- 0 high-priority errors in core app/config files.
- Legacy scripts either lint-clean or excluded by policy.
- Diagnostics run produces deterministic, categorized results.
