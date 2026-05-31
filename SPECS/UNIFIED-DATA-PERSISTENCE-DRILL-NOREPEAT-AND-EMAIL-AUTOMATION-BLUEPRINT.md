# Unified Data Persistence, Drill No-Repeat, and Email Automation Blueprint

## Purpose

Convert the spec into an implementation sequence with low risk and fast validation.

Reference spec: [SPECS/UNIFIED-DATA-PERSISTENCE-DRILL-NOREPEAT-AND-EMAIL-AUTOMATION-SPEC.md](SPECS/UNIFIED-DATA-PERSISTENCE-DRILL-NOREPEAT-AND-EMAIL-AUTOMATION-SPEC.md)

## Architecture Direction

### Principle A: Reuse Existing Systems First

- Keep existing tracking tables and routes.
- Keep existing email automation and template models.
- Add only the missing primitives for no-repeat drill cycles and unified outbound logs.

### Principle B: Additive Migrations Only

- New tables and indexes only.
- No destructive migrations in this phase.

### Principle C: Idempotent Trigger Processing

- Preserve unique dedupe in `EmailAutomationDelivery`.
- Use deterministic trigger keys for new events.

## Database Changes

Update [prisma/schema.prisma](prisma/schema.prisma) with:

1. `DrillQuestionExposure`
2. `DrillScopeState`
3. `OutboundEmailMessage`

Add migration:

- `prisma/migrations/<timestamp>_drill_norepeat_and_outbound_email_logs/`

### Model Contracts

#### DrillQuestionExposure

- Unique `(userId, questionId, scopeKey, cycleNumber)`
- Stores each seen question per user scope-cycle

#### DrillScopeState

- Unique `(userId, scopeKey)`
- Tracks current cycle number

#### OutboundEmailMessage

- Unified outbound log row for every email attempt
- Stores rendered content snapshot and provider status

## Service and API Change Map

### 1. Topic Drill Selection

Primary locations to update:

- [src/app/api/questions/practice/route.ts](src/app/api/questions/practice/route.ts)
- [src/services/unifiedQuestionGenerator.ts](src/services/unifiedQuestionGenerator.ts) only if drill selection logic is shared there
- Add new helper: `src/lib/drill-question-selection.ts`

New helper responsibilities:

- Build `scopeKey` from request filters.
- Fetch unseen candidates for current cycle.
- Auto-roll cycle when exhausted.
- Persist exposures transactionally.

### 2. Drill Start Tracking

Add new route:

- `src/app/api/tracking/drill/start/route.ts`

Responsibilities:

- Validate auth and payload (`moduleType`, `category`, `difficulty`, requested question count).
- Insert `UserEvent` (`eventType='drill'`, `eventName='drill_started'`).
- Trigger `processEmailAutomationEvent` with deterministic key:
  - `triggerKey = drill_started:<userId>:<scopeKey>:<yyyy-mm-ddThh:mm bucket>`

Client updates:

- Call drill-start endpoint when a drill is initiated.

### 3. Drill Completion Enhancements

Update existing route:

- [src/app/api/tracking/drill/route.ts](src/app/api/tracking/drill/route.ts)

Add event derivations:

- `perfect_drill_score` when score is 100.
- `drill_completed_high_score` and `drill_completed_low_score` by threshold.
- `drill_pool_cycle_completed` when selector indicates cycle rollover occurred.

### 4. Email Send Logging

Update send paths:

- [src/lib/email-automations.ts](src/lib/email-automations.ts)
- [src/lib/email-campaigns.ts](src/lib/email-campaigns.ts)
- [src/lib/resend.ts](src/lib/resend.ts) wrapper call-sites

Implementation pattern:

1. Insert `OutboundEmailMessage(status='queued')`
2. Send provider request
3. Update message row to `sent` or `failed`
4. Keep existing `EmailAutomationDelivery` writes for automation idempotency

## Automation Catalog Expansion

Add catalog entries in:

- [src/lib/lifecycle-email-catalog.ts](src/lib/lifecycle-email-catalog.ts)

Add bootstrap/upsert support in:

- [scripts/bootstrap-lifecycle-email-automations.ts](scripts/bootstrap-lifecycle-email-automations.ts)

Required additions:

- 10+ new templates and automation definitions listed in spec.
- Include promo code placeholders for designated templates.

## Promo Code Setup

Update promo seed/store logic in:

- [src/lib/promo-code-store.ts](src/lib/promo-code-store.ts)

Add automation-specific codes:

- `DRILLBOOST1`
- `STREAK7BONUS`
- `COMEBACKTEST`

Rules:

- create-only seeding,
- active + email-selectable,
- redeem policy aligned with existing promo redemption logic.

## Implementation Phases

### Phase 1: Data Layer (must ship first)

1. Add Prisma models.
2. Generate client.
3. Apply additive migration (or additive SQL if local drift requires script path).
4. Add helper module `drill-question-selection.ts`.

Exit criteria:

- Typecheck passes.
- New tables are queryable.

### Phase 2: No-Repeat Drill Delivery

1. Integrate selector into topic drill fetch route.
2. Persist exposures transactionally.
3. Add cycle rollover behavior.
4. Add telemetry event when cycle rolls.

Exit criteria:

- Try Again never repeats within cycle.
- Repeats occur only after full pool exhaustion.

### Phase 3: Drill Start + New Triggers

1. Add drill-start route.
2. Add client call on drill initiation.
3. Emit new automation events from start/completion paths.

Exit criteria:

- Drill starts and all new trigger events visible in DB.

### Phase 4: Outbound Email Message Log

1. Add unified write path for outbound message rows.
2. Attach provider IDs and status transitions.
3. Ensure automation and campaign sends both write logs.

Exit criteria:

- Every outbound send has an `OutboundEmailMessage` record.

### Phase 5: 10+ AI Email Automations

1. Add templates + automations to lifecycle catalog.
2. Bootstrap into DB.
3. Validate trigger bindings.

Exit criteria:

- At least 10 new active-ready templates in DB.
- Promo code emails render with valid code blocks.

## Validation Plan

### Automated Checks

- `npx tsc --noEmit`
- targeted route tests for drill selection and tracking
- automation processing unit/integration checks

### Manual QA

1. Start a drill twice in same scope and confirm zero repeated questions.
2. Continue drill runs until pool exhausted and verify cycle rollover.
3. Trigger drill-start and drill-complete events; confirm emails sent only to deliverable accounts.
4. Verify `OutboundEmailMessage` rows for queued/sent/failed lifecycle.
5. Verify `EmailAutomationDelivery` idempotency remains intact.

### SQL Spot Checks

- Exposure count by user/scope/cycle
- Duplicate guard validation on exposure unique key
- Outbound message status counts per day
- Trigger event frequency and delivery rates

## Rollout Strategy

1. Deploy schema and backend logic behind feature flags:
   - `DRILL_NOREPEAT_ENABLED=true`
   - `OUTBOUND_EMAIL_LOG_ENABLED=true`
2. Enable for internal/tester users first.
3. Monitor query performance and email error rates.
4. Roll out to all users.

## Risk Register

1. Scope explosion for mixed drills:
   - Mitigation: strict scope-key normalization and fallback rules.
2. Question scarcity in narrow filters:
   - Mitigation: clear user-facing message when pool is small and cycle rollover occurs.
3. Extra DB writes from exposure logging:
   - Mitigation: batched inserts in transaction and indexes tuned for `(userId, scopeKey, cycleNumber)`.
4. Email over-sending from new triggers:
   - Mitigation: deterministic trigger keys and cooldown filters in trigger metadata.

## Concrete Deliverables

1. Schema + migration for three new tables.
2. New drill selector helper and integrated API path.
3. New drill start route.
4. Outbound email message persistence across send paths.
5. 10+ new AI automation templates and triggers with bootstrap script updates.
6. QA report with proofs for no-repeat behavior and outbound email logging.
