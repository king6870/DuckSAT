# PRACTICE TEST PUBLISH GUARD SPEC

## 1) Summary
Add a strict server-side validation gate to prevent publishing any practice test that does not contain a complete, SAT-structured module set.

This prevents broken user flows (including loading deadlocks and missing sections) caused by partially assembled tests.

## 2) Problem
Published practice tests can currently have incomplete module coverage (for example, only Math modules populated). Once published, learners may enter invalid test states and experience stalled/incorrect test execution.

## 3) Goal
Block publishing when module composition is incomplete or malformed.

## 4) Scope
### In scope
- Validation in admin publish endpoint before setting `isPublished = true`.
- Deterministic completeness checks for all 4 module indexes.
- Clear API error payload returned to admin UI.

### Out of scope
- Auto-filling missing modules/questions.
- Reordering or rewriting practice test questions.
- SAT scoring algorithm changes.

## 5) Required Validation Rules
For a practice test `id`, publishing is allowed only if all rules pass:

1. Module indexes present: `0, 1, 2, 3`.
2. No unexpected module indexes outside `0..3`.
3. Module type integrity:
   - `0` and `1` must map to Reading/Writing questions.
   - `2` and `3` must map to Math questions.
4. Minimum counts by module:
   - `0 >= 1`, `1 >= 1`, `2 >= 1`, `3 >= 1` (hard minimum to prevent empty modules).
5. Optional strict SAT target mode (feature-flagged):
   - `0 == 27`, `1 == 27`, `2 == 22`, `3 == 22`.

## 6) Endpoint Behavior
Target endpoint: `src/app/api/admin/practice-tests/[id]/publish/route.ts`

### Request
- Method: `POST`
- Auth: Admin required

### Success (`200`)
```json
{
  "success": true,
  "published": true,
  "validation": {
    "passed": true,
    "moduleCounts": {
      "0": 27,
      "1": 27,
      "2": 22,
      "3": 22
    }
  }
}
```

### Validation failure (`400`)
```json
{
  "success": false,
  "error": "Practice test is incomplete and cannot be published",
  "validation": {
    "passed": false,
    "issues": [
      "Missing module index 0",
      "Module 1 has 0 questions"
    ],
    "moduleCounts": {
      "2": 11,
      "3": 11
    }
  }
}
```

## 7) UI/UX Requirements (Admin)
When publish fails due to validation:
- Show validation issues list in admin publish UI.
- Do not silently fail.
- Keep publish button enabled for retry after data correction.

## 8) Logging & Observability
Server logs should include:
- practice test id
- module counts map
- issue list
- user/admin id/email initiating publish

## 9) Acceptance Criteria
1. Publish request is rejected when any module index in `0..3` is missing.
2. Publish request is rejected when any module has zero questions.
3. Publish request is rejected when module/question type mapping is invalid.
4. Valid complete practice test publishes successfully.
5. Error response includes machine-readable `validation.issues` and `validation.moduleCounts`.
6. Existing published tests are unaffected until re-publish action.

## 10) Test Plan
- Unit/route tests for:
  - missing modules
  - empty modules
  - module type mismatch
  - valid complete test
- Manual smoke:
  - attempt publish on incomplete test from admin UI
  - verify readable failure message
  - repair data and re-publish successfully

## 11) Rollout Plan
1. Implement validation gate in publish API.
2. Surface backend issues in admin publish UI.
3. Run module-count audit script pre-release.
4. Backfill incomplete published tests as needed.

## 12) Risks
- Existing workflows relying on partial test publish may fail.
  - Mitigation: feature flag strict mode and start with minimum non-empty module guard.
