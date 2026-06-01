# Topic Drills No-Repeat Production Resilience Spec

## Problem
Topic drill requests with `noRepeat=true` can fail with HTTP 500 when no-repeat database tables are missing or not migrated in a deployment environment.

Observed failure path:
- Request: `GET /api/questions/practice?...&noRepeat=true`
- API path invokes no-repeat selector:
  - `src/app/api/questions/practice/route.ts`
  - `src/lib/drill-question-selection.ts`
- No-repeat selector depends on Prisma models/tables:
  - `drill_scope_states`
  - `drill_question_exposures`

If those tables are unavailable, Prisma throws and the API returns 500, breaking all topic drills.

## Goals
1. Topic drills must never fail hard because no-repeat infrastructure is unavailable.
2. Preserve no-repeat behavior whenever infrastructure is available.
3. Degrade safely to legacy selection behavior when unavailable.
4. Return HTTP 200 with questions instead of 500 in degraded mode.
5. Log explicit diagnostics for degraded mode to aid production investigation.

## Non-Goals
1. Reworking no-repeat algorithm logic itself.
2. Changing client behavior in `src/app/practice/[category]/page.tsx`.
3. Performing destructive schema operations.

## Functional Requirements
1. `GET /api/questions/practice` must detect no-repeat infrastructure errors.
2. On detection, API must fall back to standard `question.findMany` selection.
3. Response should include no-repeat metadata indicating degraded fallback state.
4. Existing filters (`moduleType`, `category`, `difficulty`, exclusions) must still apply.
5. API must continue to return filtered and transformed question payloads as before.

## Error Classification
Treat as no-repeat infrastructure failure when Prisma throws table/column/model-not-found style errors for no-repeat entities, including but not limited to:
- Prisma known request code table not found (ex: `P2021`)
- Prisma known request code column not found (ex: `P2022`)
- Messages referencing:
  - `drill_scope_states`
  - `drill_question_exposures`
  - `DrillScopeState`
  - `DrillQuestionExposure`

## Success Criteria
1. Drill requests with `noRepeat=true` return 200 even when no-repeat tables are missing.
2. Drill requests still return expected count whenever base question pool supports it.
3. Existing environments with correct no-repeat schema continue using no-repeat path.
4. No new TypeScript errors.

## Validation Plan
1. Typecheck (`npx tsc --noEmit`).
2. Lint run (`npm run lint`) with no new blocking errors.
3. Local API smoke checks for representative topic drill URLs:
   - reading-writing category + difficulty
   - math category
4. Confirm response payload includes fallback metadata only when degraded mode is triggered.

## Rollout
1. Ship API fallback patch.
2. Keep/add migration and schema-ensure scripts to restore full no-repeat infra.
3. Monitor logs for fallback warning events and drive migration completion in affected environments.
