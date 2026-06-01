# Topic Drills No-Repeat Production Resilience Blueprint

## Architecture Change
Implement resilient dual-path selection in `src/app/api/questions/practice/route.ts`:

1. Primary path (current behavior)
- If request asks for no-repeat and user is authenticated, attempt:
  - build scope key
  - run `selectNoRepeatDrillQuestions`
  - fetch selected question IDs in order

2. Fallback path (new)
- If primary no-repeat path fails due known infrastructure errors, immediately fallback to standard query path:
  - `prisma.question.findMany` with existing filters and order
  - preserve existing downstream filtering/transforms
- Continue returning 200 and questions.

## Implementation Steps
1. Add helper `isNoRepeatInfrastructureError(error)` in practice route.
2. Switch `shouldUseNoRepeat` from immutable to mutable within request scope.
3. Wrap no-repeat selection block in `try/catch`.
4. In catch:
- If infra error: log warning, set fallback metadata, execute standard query.
- Else: rethrow to preserve true unexpected failure behavior.
5. Extend response `noRepeat` metadata with fallback reason when used.

## Logging
Add explicit warning log with context:
- endpoint
- requested scope (module/category/difficulty)
- user id (if present)
- fallback reason

## Data Contract Impact
No breaking changes for client:
- Existing `data.questions` shape unchanged.
- Additional optional metadata field:
  - `noRepeat.degraded: true`
  - `noRepeat.reason: <string>`

## Test Matrix
1. `noRepeat=true`, authenticated, healthy no-repeat infra: uses no-repeat path.
2. `noRepeat=true`, authenticated, missing no-repeat infra: falls back to standard path and returns 200.
3. `noRepeat=true`, unauthenticated: existing standard path remains.
4. `noRepeat=false`: unchanged behavior.
5. Reading-writing and math topic permutations.

## Risk Assessment
Low risk:
- Change is scoped to one API endpoint.
- Fallback uses existing mature question query logic.
- No schema-destructive changes.

## Rollback
Single-file rollback:
- revert `src/app/api/questions/practice/route.ts` to previous logic.
- docs remain informational and non-runtime.
