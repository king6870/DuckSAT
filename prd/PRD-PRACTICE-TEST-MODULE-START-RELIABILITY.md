# PRD: Practice Test Module Start Reliability

## Overview
Users intermittently hit a blocking error when starting a module in fixed practice tests:
- Console error: `[useTestState] Cannot start module with zero questions {}`
- UI appears stuck at module start despite questions already being fetched.

## Problem
`startModule` in `useTestState` captured stale state due to incomplete hook dependencies, so it sometimes evaluated an outdated empty `currentModuleQuestions` array.

## Goals
1. Make module start deterministic after successful question fetch.
2. Eliminate false "zero questions" start failures caused by stale closures.
3. Preserve explicit error behavior for truly empty modules.
4. Improve diagnosability with contextual logs.

## Non-Goals
- Redesign of test flow UX.
- Changing SAT module sequencing logic.
- Reworking API payload structure.

## User Impact
- Users can reliably begin Reading Module 1 immediately after selecting a practice test.
- Reduced confusion from false blocking errors.

## Functional Requirements
1. `startModule` must read current question state, not stale closure state.
2. If module has questions, it must always start timer and first question view.
3. If module is truly empty, error should remain explicit.
4. Logging must include context (`practiceTestId`, `currentModuleIndex`, `moduleTitle`).

## Acceptance Criteria
- No false `Cannot start module with zero questions` when module question count > 0.
- Module starts successfully after `fetchQuestions` loads module content.
- Existing guards still block truly empty modules.
- Type diagnostics pass on modified files.

## Rollout
- Apply hook dependency fix in `useTestState`.
- Validate via local flow: `/practice-tests` -> start test -> start module.
- Monitor console/server logs for recurrence.

## Risks
- Increased callback recreation due to broader dependencies.
  - Mitigation: acceptable for this scope; correctness over memo micro-optimization.
