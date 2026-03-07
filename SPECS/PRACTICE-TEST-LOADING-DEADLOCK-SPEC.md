# PRACTICE TEST LOADING DEADLOCK SPEC

## 1) Summary
Practice test sessions were getting stuck on a perpetual loading screen after users clicked **Start Test**. The issue occurred when a fixed practice test had empty early modules (e.g., only math modules populated) while the client flow always initialized from module index `0` (Reading/Writing).

This spec defines the remediation to prevent loading deadlocks and provide explicit user-facing errors.

## 2) Problem Statement
### Observed behavior
- User opens `/practice-test?practiceTestId=<id>`.
- User clicks **Start Practice Test**.
- UI never advances to question view and appears stuck loading.

### Root causes
1. **Assumed module ordering** in `useTestState` for fixed tests:
   - Flow starts at module `0` regardless of whether module `0` has questions.
2. **No guardrail for empty modules**:
   - If current module had zero questions, state could not progress to active question view.
3. **Insufficient error surfacing**:
   - Runtime fetch/start errors were not consistently exposed in UX, causing apparent infinite loading.

## 3) Scope
### In scope
- Fixed practice test startup and module-loading behavior in client state management.
- Error handling and user feedback for missing-module/missing-question cases.

### Out of scope
- Re-authoring practice test content.
- Rebalancing module question distributions in existing tests.
- SAT scoring model changes.

## 4) Design
## 4.1 Hook-level loading behavior (`src/hooks/useTestState.ts`)
- Add mutable error state (`error`, `setError`) and clear before each fetch/start attempt.
- In fixed test mode:
  - When cached modules exist, resolve current module.
  - If current module is empty, auto-jump to first non-empty module.
  - If all modules are empty, throw explicit error.
- During initial fixed-test fetch:
  - Cache all modules.
  - Resolve to first non-empty module if requested module is empty.
  - Update `currentModuleIndex` accordingly.
- In `startTest`:
  - Do not mark `hasStarted` true until questions are successfully loaded.
  - If no questions loaded, fail with explicit error and keep user out of dead state.
- In `startModule`:
  - Guard against zero-question module and set explicit error.

## 4.2 UI behavior (`src/app/practice-test/page.tsx`)
- Read `isLoading` and `error` from `useTestState`.
- Before test start, if `error` is set:
  - Show explicit error card with:
    - **Back to Practice Tests**
    - **Retry**
- Replace bottom fallback retry behavior with deterministic back navigation for error state.

## 5) Data Validation Findings
Audit of published tests showed missing early modules:
- Practice Test 1: only module indexes `2`, `3` populated.
- Practice Test 2: only module indexes `2`, `3` populated.

The implementation therefore must handle sparse/incomplete module assignments safely.

## 6) Acceptance Criteria
1. Starting a fixed practice test with empty module `0` no longer deadlocks.
2. Client auto-selects first non-empty module in fixed test mode.
3. If all modules are empty, user sees explicit actionable error (no infinite loader).
4. `hasStarted` remains `false` if startup fetch fails.
5. Error UX offers retry and back navigation.
6. Typecheck/diagnostics on modified files report no new errors.

## 7) Risks and Mitigations
- **Risk:** Auto-jump to first non-empty module may alter expected SAT sequence.
  - **Mitigation:** Explicitly scoped as resilience behavior for incomplete test data.
- **Risk:** Hidden data quality issues remain in DB.
  - **Mitigation:** Keep operational script checks for module population and add admin visibility for missing modules.

## 8) Implementation Notes
Files changed:
- `src/hooks/useTestState.ts`
- `src/app/practice-test/page.tsx`
- `scripts/check-practice-test-module-counts.ts` (diagnostic support)

## 9) Follow-up Recommendations
1. Add server-side validation to publishing flow requiring all 4 module indexes (`0..3`) and expected counts before allowing publish.
2. Add automated regression test for fixed practice test startup with sparse modules.
3. Add admin warning badge when a published test has incomplete module coverage.
