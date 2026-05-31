# Unified Data Persistence, Drill No-Repeat, and Email Automation Spec

## Goal

Deliver three guarantees across DuckSAT:

1. Everything meaningful a user does is persisted in SQL (not just in browser state).
2. Topic drills do not repeat questions for an account until the full scoped pool has been exhausted.
3. Triggered emails are AI-authored, personalized, stored in DB, and sent automatically for key drill and progress events.

This spec is intentionally additive to existing DuckSAT systems in [prisma/schema.prisma](prisma/schema.prisma), [src/lib/email-automations.ts](src/lib/email-automations.ts), [src/lib/email-campaigns.ts](src/lib/email-campaigns.ts), and tracking routes under [src/app/api/tracking](src/app/api/tracking).

## Current State Summary

Already present:

- User data and core progress persistence: `User`, `TestResult`, `QuestionResult`, `DrillAttempt`, `DrillQuestionResult`, `UserDailyActivity`, `PageView`, `UserEvent`.
- Email template + automation persistence: `EmailTemplate`, `EmailAutomation`, `EmailAutomationDelivery`, `InboundEmail`.
- Triggered automation processing already wired in:
  - [src/app/api/tracking/pageview/route.ts](src/app/api/tracking/pageview/route.ts)
  - [src/app/api/tracking/drill/route.ts](src/app/api/tracking/drill/route.ts)
  - [src/app/api/test-results/route.ts](src/app/api/test-results/route.ts)

Missing or incomplete for this request:

- Explicit drill-start event persistence and corresponding email trigger.
- Strict no-repeat question serving for topic drills per account until full pool cycle is complete.
- Unified outbound email message log that stores final rendered payload and delivery lifecycle for every send path (automation + manual + lifecycle).
- Expanded trigger catalog with at least 10 new automatic emails.

## Product Requirements

### R1. Persist All User Activity in Database

DuckSAT must persist, at minimum:

- Drill starts.
- Drill completions (already persisted).
- Drill-level and question-level outcomes (already persisted).
- Pageviews and generic events (already persisted).
- Practice test completion events (already persisted).
- Outbound email sends, status updates, and rendered content snapshots.

No critical activity should be available only in localStorage.

### R2. Strict No-Repeat Topic Drill Questions

For any account and drill scope, question selection must satisfy:

- No repeated question IDs for that user within the same scope cycle.
- Clicking Try Again must still use unseen questions first.
- Repeats allowed only after all questions in the scope have been seen for that cycle.
- After pool exhaustion, start a new cycle and continue no-repeat within that new cycle.

### R3. AI-Generated Triggered Emails

DuckSAT must support automated, personalized emails for drill lifecycle and related progress moments, including:

- Drill start encouragement.
- Drill completion encouragement.
- Performance-sensitive follow-up variants.
- Streak and inactivity nudges.
- Some emails containing promo codes for free tests.

All outbound emails must be stored in DB with status and metadata.

### R4. Store Email Templates and Trigger Assignments in DB

Email templates and automations already exist in DB and must remain the source of truth.
New templates and automations must be seeded or upserted through server scripts and not hardcoded in frontend state.

## Data Model Additions

### 1. DrillQuestionExposure

Tracks per-user question exposures in drills by scope and cycle.

Proposed model:

- `id`
- `userId`
- `questionId`
- `scopeKey` (normalized key such as `moduleType|category|difficulty`)
- `cycleNumber` (starts at 1)
- `seenAt`
- `source` (`drill` for now)
- `drillAttemptId` (nullable for start-time reservations)

Indexes and constraints:

- Unique: `(userId, questionId, scopeKey, cycleNumber)`
- Index: `(userId, scopeKey, cycleNumber)`
- Index: `(questionId)`

### 2. DrillScopeState

Tracks cycle state for each user and scope.

Proposed model:

- `id`
- `userId`
- `scopeKey`
- `cycleNumber`
- `lastCompletedCycleAt`
- `createdAt`
- `updatedAt`

Constraint:

- Unique: `(userId, scopeKey)`

### 3. OutboundEmailMessage

Unified message log for every outgoing email.

Proposed model:

- `id`
- `userId` (nullable if recipient not tied to user row)
- `toEmail`
- `fromEmail`
- `replyToEmail`
- `channel` (`automation`, `campaign`, `lifecycle`, `transactional`)
- `templateId` (nullable)
- `automationId` (nullable)
- `triggerType` (nullable)
- `triggerKey` (nullable)
- `subject`
- `htmlBody` (`@db.Text`)
- `textBody` (`@db.Text`)
- `provider` (`resend`)
- `providerMessageId` (nullable)
- `status` (`queued`, `sent`, `failed`, `bounced`, `complained`, `suppressed`)
- `error` (nullable)
- `metadata` (JSON string)
- `sentAt` (nullable)
- `createdAt`
- `updatedAt`

Indexes:

- `(userId, createdAt)`
- `(status, createdAt)`
- `(automationId, createdAt)`

### 4. Optional: UserEvent Expansion

Reuse existing `UserEvent` rather than creating duplicates. Add optional typed metadata conventions:

- `eventType = 'drill'`
- `eventName in ('drill_started', 'drill_completed', 'drill_try_again_clicked', 'drill_pool_cycle_completed')`

## Drill No-Repeat Selection Contract

### Scope Definition

Scope key is deterministic and based on user-selected drill filters:

- `moduleType`
- `category`
- `difficulty`

Example:

- `math|algebra|medium`

### Selection Algorithm

For `count = N`:

1. Read `DrillScopeState` for `(userId, scopeKey)`, create default with `cycleNumber = 1` if absent.
2. Query active candidate questions for the scope.
3. Exclude question IDs already present in `DrillQuestionExposure` for `(userId, scopeKey, cycleNumber)`.
4. If unseen candidates `>= N`, return first `N` by randomized stable ordering.
5. If unseen candidates `< N`:
   - If unseen candidates `> 0`, return all unseen (do not repeat within current request).
   - If unseen candidates `= 0`, increment cycle in `DrillScopeState` and select from fresh unseen set in new cycle.
6. Persist exposures for all returned questions in a transaction.

### Try Again Behavior

Try Again must call the same selector path with identical scope.

- It must not clear exposure history.
- It must not reuse previous questions unless cycle rollover occurred due to full exhaustion.

### Concurrency Safety

Selection + exposure insert must run transactionally to avoid race duplicates.

- Use serializable transaction where practical.
- Enforce unique constraint `(userId, questionId, scopeKey, cycleNumber)`.
- On conflict, retry selection once with fresh unseen query.

## Email Automation Expansion

Add at least 10 new automation templates and trigger definitions.

### New Trigger Events

Add/standardize events in tracking + automation processing:

- `drill_started`
- `drill_completed`
- `drill_completed_high_score`
- `drill_completed_low_score`
- `drill_streak_3`
- `drill_streak_7`
- `first_drill_math`
- `first_drill_reading_writing`
- `drill_inactivity_24h`
- `drill_pool_cycle_completed`
- `perfect_drill_score`
- `retry_after_low_score`

### Required 10+ Templates (AI-authored)

Minimum set:

1. Drill Started - Keep Going
2. Drill Completed - Nice Work
3. Drill Completed - Keep Pushing (low score)
4. Perfect Drill - You Crushed It
5. Streak 3 - Momentum Building
6. Streak 7 - Consistency Reward (include promo code)
7. First Math Drill - Strong Start
8. First Reading/Writing Drill - Great Start
9. Inactivity 24h After Drill - Come Back Today
10. Try Again After Low Score - Focused Recovery Plan
11. Pool Completed - New Cycle Unlocked
12. Weekly Drill Progress Digest

At least 3 of these should include optional promo-code blocks for free tests.

### Promo Code Requirements

- Use DB-backed `PromoCode` records.
- Add dedicated free-test promo codes for automation use (for example `DRILLBOOST1`, `STREAK7BONUS`, `COMEBACKTEST`).
- Enforce single-use or bounded-use policy per user in redemption logic.

## Delivery Logging Requirements

For every send attempt:

- Insert `OutboundEmailMessage` row before provider call with `status='queued'`.
- Update to `sent` and fill provider IDs on success.
- Update to `failed` with error payload on failure.
- Keep `EmailAutomationDelivery` for idempotency and automation-level dedupe.
- Link `OutboundEmailMessage.automationId` and `triggerKey` where applicable.

## API and Service Changes

### Tracking

- Add `POST /api/tracking/drill/start` route:
  - persist `UserEvent` + optional lightweight `DrillAttempt` pre-row strategy (or dedicated start event only),
  - invoke `processEmailAutomationEvent` with `triggerType='user_event'`, `eventName='drill_started'`.

### Drill Question Selection

- Update topic drill question fetch service/route to use no-repeat selector and exposure persistence.
- Ensure practice-test flows remain unchanged.

### Email Services

- Extend [src/lib/email-automations.ts](src/lib/email-automations.ts) with new trigger handling and metadata shaping.
- Extend email send path to write `OutboundEmailMessage`.
- Keep unsubscribe checks and synthetic-email skip rules from [src/lib/email-campaigns.ts](src/lib/email-campaigns.ts).

## Non-Functional Requirements

- No regression to current drill latency beyond acceptable threshold (target p95 < 350 ms selection overhead).
- No duplicate sends for same `(automationId, userId, triggerKey)`.
- Full auditability of outbound messages in DB.

## Acceptance Criteria

1. Drill Try Again does not repeat previously seen scoped questions until full pool exhaustion.
2. After pool exhaustion, cycle increments and questions can reappear in the next cycle.
3. Drill starts are persisted and visible in DB events.
4. At least 10 new automation templates exist in DB and can be activated.
5. Triggered drill-start and drill-complete emails are sent to the initiating account when deliverable.
6. Every outbound email is stored in DB with status and provider metadata.
7. Promo-code emails include valid redeemable codes and are tracked.
8. Existing unsubscribe and `@duck.local` suppression behavior remains intact.

## Out of Scope for This Phase

- Building a visual replay timeline UI for all events.
- Replacing all historical tables with one mega table.
- Cross-device event stream export UI.
