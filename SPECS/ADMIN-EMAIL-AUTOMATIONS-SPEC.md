# Admin Email Automations Spec

## Goal

Add an admin-only automation system inside DuckSAT so an authorized admin can:

- maintain a library of pre-generated reusable email templates,
- define behavior-based email triggers,
- assign a chosen trigger to a chosen pre-generated email template,
- generate email copy from an AI prompt,
- send personalized emails automatically when a user matches a trigger,
- manually send any saved template on demand,
- ensure every live user email includes a working unsubscribe link,
- preview, test, and validate the automation before sending users live email.

This spec builds on the existing manual email campaign foundation but covers automated sends triggered by real product behavior such as time on site, drill completion, and practice test completion.

## Problem Statement

DuckSAT already has a manual admin email campaign surface, a Resend integration, and server-side tracking for user behavior. What it does not yet have as a complete product surface is:

- a reusable email-template library,
- a documented automation rule system,
- a clear trigger model for behavior-based sends,
- an AI-assisted authoring flow for automation emails,
- a way to manually send any saved pre-generated email without rebuilding it each time,
- a complete admin testing workflow for trigger emails,
- an explicit product requirement that unsubscribe handling applies to all live outbound user emails.

The key product need is straightforward:

- if a user spends time on the website and leaves,
- if a user completes a drill,
- if a user completes a practice test,
- or if a user matches another tracked event,

DuckSAT should be able to automatically send a personalized email through Resend without engineering intervention.

## Current State

### Existing manual campaigns

DuckSAT already has:

- `/admin/email-campaigns`,
- `/api/admin/email-campaigns/audience`,
- `/api/admin/email-campaigns/preview`,
- `/api/admin/email-campaigns/send`,
- a shared renderer in `src/lib/email-campaigns.ts`,
- a Resend transport in `src/lib/resend.ts`.

### Existing automation baseline

DuckSAT already has a baseline automation surface in the codebase:

- `/admin/email-automations`,
- `/api/admin/email-automations`,
- `/api/admin/email-automations/[id]`,
- `/api/admin/email-automations/generate`,
- `src/lib/email-automations.ts`.

This baseline supports CRUD for automation rules, trigger filters, AI prompt storage, and server-side event processing.

### Existing template gap

DuckSAT does not yet have a separate reusable email-template model.

Right now:

- manual campaigns store authored content directly in the page state and request payload,
- automations store authored content directly on the automation record.

That means the admin cannot yet:

- save a pre-generated email once and reuse it across multiple triggers,
- assign the same saved email to both automation and manual send flows,
- manage a central library of ready-to-send lifecycle emails.

### Existing trigger sources

DuckSAT already records the behavior needed for trigger-based sends:

- `POST /api/tracking/pageview` for page dwell time,
- `POST /api/tracking/events` for generic tracked events,
- `POST /api/tracking/drill` for drill completion,
- `POST /api/test-results` for practice test completion.

These routes are the correct trigger anchors because they are already the server-side write points for the behavior we want to react to.

### Existing unsubscribe baseline

DuckSAT already has:

- `users.emailUnsubscribedAt`,
- `src/lib/email-unsubscribe.ts`,
- `/unsubscribe`.

This gives the product a global unsubscribe foundation, but the final product requirement must be explicit: every live outbound user email from campaigns and automations must use that mechanism.

### Deliverability constraint

Credentials users may still have synthetic addresses ending in `@duck.local`.

Those accounts must never receive live email.

## Product Requirements

### 1. New admin automation surface

DuckSAT must expose an admin-only page at `/admin/email-automations` where an admin can:

- browse saved pre-generated email templates,
- choose which template a trigger should use,
- create an automation,
- edit an automation,
- pause or activate an automation,
- preview the rendered email,
- generate or rewrite the copy with AI,
- test the automation safely before turning it on.

The page should remain inside the current admin dashboard and follow the existing admin auth model using `ADMIN_EMAILS`.

### 1A. New template library surface

DuckSAT must expose an admin-only template library so an admin can:

- create a reusable email template,
- generate a template with AI,
- edit a template,
- preview a template,
- manually send a saved template,
- reuse the same template across multiple automations.

The initial implementation may place this library inside `/admin/email-automations` or in a separate route such as `/admin/email-templates`, but the product behavior must be the same either way.

### 2. Trigger types

The first supported trigger types must be:

- `page_dwell`
- `practice_test_completed`
- `drill_completed`
- `user_event`

Examples:

- user spent at least 15 seconds on `/` and left,
- user completed any practice test,
- user completed one math drill,
- user fired a tracked event such as `checkout_started` or `practice_test_completed`.

### 3. Trigger filters

Each trigger type must support filter criteria relevant to that trigger.

Initial supported filters:

- `userId`
- `userEmail`
- `pagePath`
- `minDwellTimeMs`
- `maxDwellTimeMs`
- `eventType`
- `eventName`
- `metadataKey`
- `metadataValue`
- `category`
- `moduleType`
- `difficulty`
- `minScore`
- `practiceTestId`

The admin UI must only show filter fields that are meaningful for the selected trigger type.

### 4. Personalization and email content

Automation emails must support the same token-based personalization model as manual campaigns.

Initial tokens:

- `{{firstName}}`
- `{{name}}`
- `{{email}}`
- `{{username}}`
- `{{plan}}`

Email content must support:

- subject,
- preview text,
- eyebrow,
- headline,
- body,
- primary CTA,
- optional secondary CTA,
- footer.

### 4A. Pre-generated template library

DuckSAT must support a reusable saved-template concept.

Each template should store:

- internal template name,
- description,
- optional AI prompt used to generate it,
- subject,
- preview text,
- eyebrow,
- headline,
- body,
- primary CTA,
- optional secondary CTA,
- footer,
- created time,
- updated time.

Templates should be usable in two ways:

1. assigned to one or more automation rules,
2. manually sent on demand by an admin.

### 5. AI-generated email copy

The admin must be able to provide a plain-English prompt and have DuckSAT generate automation email content.

The AI generation flow must:

- use the repo's Azure OpenAI configuration,
- return structured content rather than raw HTML,
- fill the automation form fields directly,
- preserve personalization tokens,
- allow the admin to edit the generated copy before saving it as a reusable template or activating the automation.

The AI flow should work for both:

- automation-specific authoring,
- reusable template creation.

### 6. Send rules and idempotency

The first version of automations should be one-time by default.

That means a user should not receive the same automation repeatedly for the same trigger match unless the product later adds recurring-send semantics.

Manual sends of saved templates are different from triggered sends.

Manual sends should:

- only happen when an admin explicitly clicks send,
- create a manual send record or delivery record,
- not be blocked by automation idempotency keys.

V1 delivery uniqueness should be tracked by:

- automation ID,
- user ID,
- trigger key.

### 7. Deliverability rules

Before any automation sends email, DuckSAT must verify the user is deliverable.

Skip rules:

- synthetic `@duck.local` address,
- globally unsubscribed user,
- missing resolved email address.

Each skipped decision should be visible in delivery records or test results.

### 8. Unsubscribe on all live emails

This is a hard requirement.

Every live user email sent through DuckSAT must include a visible unsubscribe section and a working unsubscribe URL.

This applies to:

- manual marketing-style campaigns,
- behavior-triggered automation emails,
- any future lifecycle emails that use the shared email renderer.

Requirements for unsubscribe:

- the URL must be recipient-specific,
- the token must be signed server-side,
- clicking the link must mark `users.emailUnsubscribedAt`,
- future campaigns and automations must skip unsubscribed users,
- the unsubscribe route must fail safely for invalid or tampered links.

### 9. Preview and testing workflow

The admin must be able to test automations before activating them.

Minimum testing requirements:

- live in-app preview of the email,
- test-send to an admin-controlled inbox,
- manual send of a saved template to a selected audience or recipient,
- a clear way to verify trigger criteria,
- a way to verify unsubscribe rendering before a real user receives email.

Recommended v1 testing path:

- create the automation,
- render the preview,
- send a labeled test email,
- activate the automation,
- trigger the real behavior with a test user,
- confirm one delivery record and one inbox email.

Recommended v1.1 improvement:

- add a `simulate trigger` action for admin-only QA without requiring a full user session flow.

### 10. Admin visibility and logs

The automation surface must expose enough information for an admin to understand what happened.

Minimum visibility:

- saved templates,
- rule name,
- assigned template name,
- trigger type,
- active or paused state,
- last updated time,
- recent send or failure counts,
- recent delivery status per automation.

### 11. Non-admin behavior

All automation pages and APIs must remain admin-only.

Expected responses:

- page routes redirect unauthenticated users to sign-in,
- API routes return `403` for non-admins.

## Technical Architecture

### 1. Data model

Use additive Prisma models:

- `EmailTemplate`
- `EmailAutomation`
- `EmailAutomationDelivery`
- `User.emailUnsubscribedAt`

`EmailTemplate` stores reusable pre-generated email content.

`EmailAutomation` stores the rule definition and points at a chosen template, while optionally keeping denormalized content only if migration compatibility requires it.

`EmailAutomationDelivery` stores the send decision and provider result.

### 2. Shared render path

Manual campaigns and automations must share the same renderer.

Saved templates must also use that same renderer.

Reason:

- one brand system,
- one personalization system,
- one unsubscribe footer path,
- less drift between preview, manual send, and automated send.

### 3. Trigger processing

Automation matching should happen at the server-side write points that already own the behavior:

- `pageview` route for dwell-based triggers,
- `events` route for generic behavior triggers,
- `drill` route for drill-completion triggers,
- `test-results` route for practice-test-completion triggers.

### 4. Delivery path

For each matched event:

1. resolve user and deliverable email,
2. skip unsubscribed or invalid recipients,
3. resolve the assigned template,
4. check idempotency,
5. render the email,
5. send through Resend,
6. persist send or failure result.

For each manual template send:

1. resolve the selected template,
2. resolve recipient or audience,
3. skip unsubscribed or invalid recipients,
4. render the email with personalization,
5. send through Resend,
6. persist the result as a manual send or delivery record.

### 5. AI generation path

Use an admin-only route to call Azure OpenAI and return a structured JSON response with content fields for the automation form.

The model should not generate raw HTML or bypass the shared renderer.

### 6. Unsubscribe path

Use a signed unsubscribe URL built from:

- user ID,
- recipient email,
- server secret.

The unsubscribe route should:

- validate the token,
- update `emailUnsubscribedAt`,
- show a user-friendly confirmation page.

## Out of Scope for This Spec

The following are intentionally out of scope for the first complete automation release:

- complex multi-step journeys,
- time-delayed sequences,
- provider webhook sync for opens and clicks,
- A/B testing,
- segment history analytics beyond send and failure logs,
- non-email channels such as SMS or push.

## Acceptance Criteria

DuckSAT satisfies this spec when the following are true:

1. An admin can create an automation for homepage dwell and activate it.
2. An admin can create and save a reusable email template.
3. An admin can assign a saved template to a homepage-dwell automation.
4. A real matching page-dwell event can send that assigned template to a deliverable test user.
5. An admin can assign a saved template to a practice-test-completion automation.
6. A real practice test completion can send that assigned template to a deliverable test user.
7. An admin can manually send any saved template on demand.
8. The AI prompt flow can generate structured email copy into the template or automation form.
9. Every live automation email includes a working unsubscribe link.
10. Every live manual template send includes a working unsubscribe link.
11. Clicking unsubscribe sets `users.emailUnsubscribedAt` and blocks future sends.
12. Synthetic `@duck.local` users are skipped automatically.
13. Non-admins cannot access automation APIs.
14. The admin has a documented, repeatable way to test the feature locally.

## Validation Plan

### Focused product checks

1. Create a reusable template.
2. Use the AI prompt flow to generate template copy and verify the preview updates.
3. Manually send that saved template to a deliverable admin-controlled or test-user inbox.
4. Create a page-dwell automation for `/` with `minDwellTimeMs = 15000` and assign the saved template.
5. Use a real DuckSAT user with a deliverable email.
6. Spend enough time on `/`, navigate away, and confirm one send.
7. Create a practice-test-completed automation and assign a saved template.
8. Complete a practice test with the same test user and confirm one send.
9. Click the unsubscribe link in the received email.
10. Repeat the trigger and confirm no second live email is sent.

### Engineering checks

1. `npx tsc --noEmit` passes.
2. `npm run build` passes.
3. `/api/health` returns `200` locally.
4. `/admin/email-automations` loads for an admin session.
5. Non-admin route and API guardrails still return `307` and `403` as expected.

## Risks

- Without a simulate-trigger action, QA still depends on performing real user actions.
- One-time idempotency is simple but may be too restrictive for future lifecycle needs.
- If provider-level suppressions are not synced back later, DuckSAT may know less than Resend about final recipient state.
- Admin test sends need a safe way to preview unsubscribe content even when the test recipient is not a DuckSAT user.

## Recommended Next Step After This Spec

Implement the remaining testability and delivery-visibility pieces on top of the current automation baseline, then run a browser-based admin QA pass with a real authenticated admin session.