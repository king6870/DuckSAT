# BLUEPRINT: DuckSAT Go-Live Execution Plan (2026-05-02)

## A. Execution Strategy
Work in strict order:
1. Spec lock
2. Blueprint lock
3. Automation foundation
4. Baseline run
5. Defect burn-down
6. Final release gate

This blueprint translates the spec into step-by-step implementation.

## B. Phase Plan

## Phase 0: Baseline Inventory (Day 0)
Goals:
- Enumerate all app routes
- Enumerate all API routes
- Confirm current test tooling and gaps
- Confirm database quality baseline

Deliverables:
- Route inventory snapshot
- API inventory snapshot
- Gap report (missing tests/tooling)

## Phase 1: Readiness Automation Foundation (Day 0-1)
Goals:
- Create a single command that runs go-live checks and emits reports.

Implementation:
- Add scripts/go-live-readiness.ts
- Checks included:
  - DB invariants and question passability checks
  - API smoke checks (critical + broad set)
  - Route health checks
  - Result report generation (JSON + MD)

Deliverables:
- Machine-readable readiness report
- Human-readable launch summary

## Phase 2: API Reliability Program (Day 1-2)
Goals:
- Guarantee no hidden 5xx failures.

Implementation:
- For each API route, add at least one smoke test path.
- Add explicit tests for auth-required endpoints:
  - Expected unauthenticated status (401/403) rather than 500.
- Add contract tests for critical endpoints:
  - practice, practice-tests, progress, questions, admin question operations.

Deliverables:
- API coverage matrix (route -> tested scenarios)
- Failing endpoint inventory with owner and ETA

## Phase 3: UI Button/Feature Validation (Day 2-3)
Goals:
- Validate every critical user interaction path and button behavior.

Implementation:
- Build a button interaction matrix for critical screens.
- Add automated browser smoke tests for:
  - navigation clicks
  - form submit buttons
  - modal open/close actions
  - CTA and menu actions
- Capture JS console errors and fail test on uncaught runtime errors.

Deliverables:
- Button coverage report
- Runtime error report by route

## Phase 4: Question-by-Question Passability (Day 2-4)
Goals:
- Ensure every question is structurally valid and passable.

Implementation:
- Run full DB passability audit on all questions.
- Bucket defects:
  - malformed options
  - invalid correctAnswer index
  - missing/weak explanation
  - category/subtopic drift
- Repair in controlled batches with re-audit after each batch.

Deliverables:
- Full passability report
- Repair changelog
- Final 0-defect passability assertion

## Phase 5: Non-Functional Readiness (Day 3-4)
Goals:
- Verify production behavior under realistic conditions.

Implementation:
- Build and production-start smoke tests
- Endpoint latency sampling for key APIs
- Security checks for authz boundaries (admin, billing webhooks)

Deliverables:
- NFR report with p95 stats
- Security checklist status

## Phase 6: Release Rehearsal and Gate (Day 4)
Goals:
- Dry-run go-live and confirm all P0 gates.

Implementation:
- Run full readiness suite from clean environment.
- Review report and defects.
- Sign-off meeting with explicit gate decision.

Deliverables:
- Final go-live report
- Go/no-go decision record

## C. Traceability Matrix
Each blueprint phase maps to spec gates:
- Phase 1 -> P0.2, P0.3, P0.4, P0.5
- Phase 2 -> P0.3, P1.2
- Phase 3 -> P0.6, P1.1
- Phase 4 -> P0.5
- Phase 5 -> P1.3, P1.4
- Phase 6 -> P0/P1 final gate

## D. Operating Rules
- No launch with unresolved P0 defects.
- Every failure must include: root cause, owner, ETA, and retest evidence.
- Every code fix requires rerun of impacted suites.

## E. Immediate Work Started In This Session
- Spec created
- Blueprint created
- Next action: implement and run readiness automation runner now
