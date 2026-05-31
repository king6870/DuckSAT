# Admin Email Automations Blueprint

## Purpose

This blueprint turns the automation spec into an implementation and validation sequence that fits DuckSAT's current codebase.

It assumes three things are already true:

- manual email campaigns already exist,
- the repo already has a baseline automation implementation,
- there is not yet a separate reusable email-template library,
- the next work should finish the feature, make unsubscribe behavior universal, and let the admin test it safely.

## Baseline Already in Repo

### Existing UI and routes

- `src/app/admin/email-automations/page.tsx`
- `src/app/api/admin/email-automations/route.ts`
- `src/app/api/admin/email-automations/[id]/route.ts`
- `src/app/api/admin/email-automations/generate/route.ts`
- `src/app/unsubscribe/route.ts`

### Existing shared libraries

- `src/lib/email-automations.ts`
- `src/lib/email-campaigns.ts`
- `src/lib/email-unsubscribe.ts`
- `src/lib/resend.ts`

### Existing trigger anchors

- `src/app/api/tracking/pageview/route.ts`
- `src/app/api/tracking/events/route.ts`
- `src/app/api/tracking/drill/route.ts`
- `src/app/api/test-results/route.ts`

### Existing data model

- `User.emailUnsubscribedAt`
- `EmailAutomation`
- `EmailAutomationDelivery`

## Remaining Feature Work

### 0. Add reusable email templates

Add the missing shared object the product still needs: a saved-template library.

Required behaviors:

- create reusable email templates,
- assign a template to an automation,
- manually send a saved template,
- generate template copy with AI,
- preview templates through the shared renderer.

### 1. Finish automation testing UX

Add a safe admin workflow so the feature can be verified without guesswork.

Required additions:

- template picker for automations,
- explicit test-send action for automations,
- explicit manual-send action for saved templates,
- explicit recent-deliveries view per automation,
- clearer trigger summary in the UI,
- visible unsubscribe rendering in preview and test mode.

Recommended additions:

- `simulate trigger` action per automation,
- sample payload preview for each trigger type.

### 2. Make unsubscribe behavior universal

The shared renderer should be treated as the only approved path for live user email.

Tasks:

- confirm all live manual campaign sends use the shared unsubscribe footer,
- confirm all live automation sends use the shared unsubscribe footer,
- ensure any future lifecycle email reuses the same helper rather than duplicating unsubscribe logic.

### 3. Tighten delivery visibility

The admin needs proof that a trigger fired and what happened next.

Add:

- recent delivery log on `/admin/email-automations`,
- status chips for `queued`, `sent`, `failed`, `skipped`,
- provider error display when Resend fails,
- timestamp of last successful send.

### 4. Finalize admin QA path

The feature should be testable end-to-end by an authenticated admin on localhost.

That requires:

- persisted env config in `.env.local`,
- clean local server startup on `http://localhost:3000`,
- a known test user with a real email,
- a documented test sequence.

## Change Set

### A. UI

Primary file:

- `src/app/admin/email-automations/page.tsx`

Likely new primary file:

- `src/app/admin/email-templates/page.tsx` or a template-library section within `src/app/admin/email-automations/page.tsx`

Expected additions:

- saved-template list,
- template picker for automation assignment,
- manual-send control for saved templates,
- recent deliveries panel,
- test-send control,
- optional simulate-trigger control,
- stronger trigger summaries,
- unsubscribe-preview note in the editor.

Optional extraction if the page grows further:

- `src/components/admin/email-automations/TemplateLibrary.tsx`
- `src/components/admin/email-automations/AutomationList.tsx`
- `src/components/admin/email-automations/AutomationEditor.tsx`
- `src/components/admin/email-automations/AutomationPreview.tsx`
- `src/components/admin/email-automations/AutomationDeliveries.tsx`

### B. Admin APIs

Keep the existing CRUD and generation routes.

Add as needed:

- `src/app/api/admin/email-templates/route.ts`
- `src/app/api/admin/email-templates/[id]/route.ts`
- `src/app/api/admin/email-templates/[id]/send/route.ts`
- `src/app/api/admin/email-automations/[id]/test/route.ts`
- `src/app/api/admin/email-automations/[id]/simulate/route.ts`
- `src/app/api/admin/email-automations/[id]/deliveries/route.ts`

### C. Shared server logic

Primary files:

- `src/lib/email-templates.ts`
- `src/lib/email-automations.ts`
- `src/lib/email-campaigns.ts`
- `src/lib/email-unsubscribe.ts`

Expected follow-up changes:

- support template CRUD and lookup,
- support resolving automation content from a template assignment,
- support manual sends from saved templates,
- support test rendering that still exposes unsubscribe UI safely,
- support delivery listing by automation,
- support simulation payloads without creating production sends,
- keep send idempotency explicit and documented.

### D. Trigger integration

The current trigger anchors are correct and should remain the only V1 event-processing entry points.

Do not create a second parallel automation-ingestion system.

If more behaviors need support later, add them at the nearest server-side write path rather than inventing a background polling model.

## Implementation Order

1. Document the template-library and trigger-assignment contract in the spec and blueprint.
2. Add the reusable email-template data model and shared server helpers.
3. Add template CRUD APIs.
4. Add template picker support to automations.
5. Add manual-send support for saved templates.
6. Add automation delivery read APIs and recent-deliveries UI.
7. Add a test-send flow for automations.
8. Add a simulate-trigger flow if the browser QA path is still too manual.
9. Ensure preview and test mode visibly include unsubscribe content.
10. Re-verify all live email paths skip unsubscribed users.
11. Run local end-to-end QA with an authenticated admin session and a real test user.

## Trigger-by-Trigger Delivery Plan

### Page dwell

Goal:

- send one follow-up email when a user spends meaningful time on a page and leaves.

Implementation notes:

- keep the trigger in `pageview` because it already has `pagePath` and `dwellTimeMs`,
- use `minDwellTimeMs` as the primary filter,
- keep initial dedupe as one-time send per automation and user.

### Practice test completed

Goal:

- send a follow-up or conversion email after a test is completed.

Implementation notes:

- keep the trigger in `test-results`,
- use `practiceTestId` and `minScore` filters where needed,
- prefer score-based follow-up messaging in AI prompts.

### Drill completed

Goal:

- send a focused follow-up after a user completes a drill in a topic or module.

Implementation notes:

- keep the trigger in `tracking/drill`,
- filter on `category`, `moduleType`, `difficulty`, and `minScore`.

### Generic tracked event

Goal:

- let the admin react to any product event already recorded in `user_events`.

Implementation notes:

- keep the trigger in `tracking/events`,
- allow `eventType`, `eventName`, and optional metadata matching,
- use this as the extensibility path before adding brand-new trigger types.

## AI Email Generation Blueprint

### Authoring contract

The AI route should keep returning structured JSON fields only.

Never let the model emit freeform HTML that bypasses the shared renderer.

### Prompt strategy

Each generation request should include:

- trigger type,
- trigger filters summary,
- admin prompt,
- allowed personalization tokens,
- brand voice constraints,
- CTA expectation.

### Admin workflow

1. Create or open a reusable template.
2. Write prompt.
3. Generate copy.
4. Edit manually.
5. Preview.
6. Save template.
7. Either manually send the template or assign it to a trigger.
8. Test send.
9. Activate the automation if using a trigger.

## Unsubscribe Blueprint

### Required behavior

Every live user email should include:

- footer note,
- unsubscribe link,
- server-generated tokenized URL.

### Shared-path rule

No new email send path should be allowed to bypass:

- `buildEmailUnsubscribeUrl(...)`
- `unsubscribeUserFromEmails(...)`
- the shared email renderer.

### QA expectation

The admin must be able to verify:

- unsubscribe footer appears in preview,
- unsubscribe footer appears in delivered live email,
- unsubscribe action updates the database,
- future sends skip the unsubscribed user.

## Validation Blueprint

### Static validation

1. `npx prisma generate`
2. `npx tsc --noEmit`
3. `npm run build`

### Local runtime validation

1. Stop all existing Node processes.
2. Start `npm run dev` on `http://localhost:3000`.
3. Confirm `GET /api/health` returns `200`.
4. Confirm non-admin automation APIs still return `403` unauthenticated.
5. Sign in as an allowed admin.

### Browser QA sequence

1. Open the template library or the template section inside `/admin/email-automations`.
2. Create a reusable template.
3. Use AI generation to draft the copy.
4. Review preview and manual-send behavior.
5. Manually send the saved template and confirm delivery.
6. Create a page-dwell automation.
7. Assign the saved template to that automation.
8. Activate the automation.
9. Perform the real user action with a deliverable test user.
10. Confirm the inbox email arrives.
11. Click unsubscribe.
12. Repeat the trigger and confirm no second live email arrives.
13. Repeat the same pattern for a practice-test-completed automation.

### Delivery evidence required before handoff

- one successful saved-template manual send,
- one successful page-dwell-triggered live send,
- one successful practice-test-triggered live send,
- one successful unsubscribe suppression check,
- one successful AI-generated authoring flow,
- screenshots or logs for admin UI, API result, and received email.

## Risks

- Local SQL Server schema drift means additive targeted SQL is safer than a full `prisma db push` for this repo.
- Test-send and preview unsubscribe behavior need explicit product handling for non-user admin inboxes.
- Real trigger QA is slower without a simulate-trigger tool.
- Overusing `user_event` triggers without naming discipline can make automations hard to reason about.

## Rollback Strategy

- pause all automations in the admin UI,
- disable the admin route if needed,
- keep the models in place because they are additive,
- leave unsubscribe support intact even if automations are temporarily hidden.

## Recommended Delivery Phases

### Phase 1

- finalize spec and blueprint,
- stabilize current automation baseline,
- verify shared unsubscribe path.

### Phase 2

- finish test-send and delivery-log UX,
- finish authenticated browser QA,
- prove page-dwell and practice-test flows end-to-end.

### Phase 3

- add simulate-trigger controls,
- add richer delivery metrics,
- optionally add provider webhook sync later.