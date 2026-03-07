# SPEC: Practice Test Module Start Stale-Closure Fix

## Context
In fixed practice tests, users observed module-start failures with:
`[useTestState] Cannot start module with zero questions`

However logs showed module data was already loaded (e.g., `Loaded 27 questions for module 0`).

## Root Cause
`startModule` used `currentModuleQuestions.length` but its `useCallback` dependency list only included `currentModule`, causing stale state capture and false zero-question checks.

## Implementation
### File
- `src/hooks/useTestState.ts`

### Changes
1. Update `startModule` callback dependencies to include:
   - `currentModuleQuestions.length`
   - `currentModuleIndex`
   - `logContext`
2. Update `startTest` dependencies to include log context fields used by error logging.

## Behavior After Fix
- `startModule` evaluates latest module question count at click time.
- If questions are loaded, module starts reliably.
- If no questions exist, error path remains unchanged and intentional.

## Validation Plan
1. Navigate to `/practice-tests`.
2. Start a fixed practice test with valid module data.
3. Click "Begin Module".
4. Confirm module starts and timer/questions render.
5. Confirm no false zero-question error in console.

## Acceptance Criteria
- No false-positive start blocks when module question count > 0.
- Existing true-empty-module guard remains active.
- No TypeScript/diagnostic errors in changed file.
