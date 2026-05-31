# Admin Email Campaigns Blueprint

## Change Set

### 1. Add admin entry point

- Update `src/app/admin/page.tsx`.
- Add a new `Email Campaigns` dashboard card linking to `/admin/email-campaigns`.

### 2. Add campaign page

- Add `src/app/admin/email-campaigns/page.tsx`.
- Build a campaign workspace with draft list, audience builder, composer, preview, test send, and history.

### 3. Add campaign data models

- Update `prisma/schema.prisma`.
- Add `EmailCampaign`.
- Add `EmailCampaignRecipient`.
- Add user contact and marketing fields needed for deliverable contact resolution.

### 4. Add Resend integration layer

- Add `src/lib/resend.ts` for provider client creation and env validation.
- Add server helpers for:
  - contact resolution,
  - contact sync,
  - segment creation,
  - topic assignment,
  - broadcast creation,
  - test sends.

### 5. Add email template renderer

- Add a reusable React email renderer.
- Use `public/duck-logo.svg` as the default brand mark.
- Support branded headline, body content, CTA button, footer, and unsubscribe section.

### 6. Add admin APIs

- Add campaign CRUD APIs under `src/app/api/admin/email-campaigns/**`.
- Add preview, test, send, schedule, cancel, and recipient-preview endpoints.

### 7. Add webhook ingestion

- Add `src/app/api/resend/webhook/route.ts`.
- Verify webhook signatures.
- Persist provider events into campaign and recipient state.

### 8. Add deliverable-contact strategy

- Treat `@duck.local` users as non-deliverable.
- Resolve outbound contact email from `contactEmail` first, then real `users.email`.
- Report skipped users in the admin UI.

### 9. Add marketing-consent guardrails

- Introduce marketing opt-in fields.
- Gate marketing campaigns to opted-in recipients only.
- Support Resend Topic-based unsubscribe flow.

## Implementation Order

1. Add Prisma schema for campaign models and contact fields.
2. Add Resend env/config client and provider wrappers.
3. Add contact-resolution logic and recipient preview logic.
4. Add React email renderer and test-send helper.
5. Add campaign CRUD and preview APIs.
6. Add `/admin/email-campaigns` UI.
7. Add dashboard card on `/admin`.
8. Add send and schedule APIs using Resend Segments and Broadcasts.
9. Add Resend webhook ingestion and campaign metric updates.
10. Validate with test send, internal pilot campaign, and webhook-driven status updates.

## Suggested File Map

### UI

- `src/app/admin/email-campaigns/page.tsx`
- `src/components/admin/email-campaigns/CampaignList.tsx`
- `src/components/admin/email-campaigns/AudienceBuilder.tsx`
- `src/components/admin/email-campaigns/CampaignComposer.tsx`
- `src/components/admin/email-campaigns/CampaignPreview.tsx`
- `src/components/admin/email-campaigns/CampaignHistory.tsx`

### Server

- `src/lib/resend.ts`
- `src/lib/email-campaigns/contact-resolution.ts`
- `src/lib/email-campaigns/render-campaign-email.tsx`
- `src/lib/email-campaigns/resend-sync.ts`
- `src/lib/email-campaigns/send-test-email.ts`
- `src/lib/email-campaigns/send-campaign.ts`
- `src/lib/email-campaigns/token-mapping.ts`

### API

- `src/app/api/admin/email-campaigns/route.ts`
- `src/app/api/admin/email-campaigns/[id]/route.ts`
- `src/app/api/admin/email-campaigns/[id]/preview/route.ts`
- `src/app/api/admin/email-campaigns/[id]/test/route.ts`
- `src/app/api/admin/email-campaigns/[id]/send/route.ts`
- `src/app/api/admin/email-campaigns/[id]/schedule/route.ts`
- `src/app/api/admin/email-campaigns/[id]/cancel/route.ts`
- `src/app/api/admin/email-campaigns/[id]/recipients/route.ts`
- `src/app/api/resend/webhook/route.ts`

### Email templates

- `src/emails/CampaignEmail.tsx`
- `src/emails/components/EmailShell.tsx`
- `src/emails/components/CtaButton.tsx`
- `src/emails/components/Footer.tsx`

## Data Model Direction

### User additions

- `contactEmail String?`
- `contactEmailVerifiedAt DateTime?`
- `contactEmailSource String?`
- `marketingOptInAt DateTime?`
- `marketingOptOutAt DateTime?`
- `resendContactId String?`

### EmailCampaign

Store:

- campaign identity and status,
- content JSON,
- rendered HTML and text,
- audience filter JSON,
- provider IDs,
- counts and metrics,
- scheduling and error metadata.

### EmailCampaignRecipient

Store:

- resolved address,
- deliverability decision,
- skip reason,
- provider identifiers,
- delivery and engagement timestamps.

## Provider Strategy

### Resend Contacts

Create or update a Resend Contact for each deliverable DuckSAT recipient.

Populate contact properties with app data used for personalization.

### Resend Segments

Create a dedicated segment per campaign send.

Do not treat one global segment as campaign history.

### Resend Topics

Use at least one topic for marketing sends.

Recommended initial topic:

- `DuckSAT Marketing` with `defaultSubscription=opt_out`

This keeps marketing sends off by default unless the app explicitly opts the user in.

### Resend Broadcasts

Use broadcasts for campaign sends because they fit:

- scheduled delivery,
- unsubscribe handling,
- segment targeting,
- provider-native campaign tracking.

## UI Direction

### Audience builder

The audience builder should feel closer to the existing admin data dashboard than to a generic ESP.

Use:

- filter chips,
- count cards,
- a sample-recipient table,
- visible exclusion reasons.

### Composer

Prefer a structured composer over a freeform WYSIWYG editor.

Suggested sections:

- brand header,
- content body,
- CTA controls,
- footer and unsubscribe,
- mobile and desktop preview.

### Preview

Use the same renderer for:

- in-app preview,
- test send,
- production send.

This avoids template drift.

## Validation Plan

### Focused checks

1. Prisma schema validates and migrates cleanly.
2. Test send reaches an admin inbox using the new template renderer.
3. Audience preview excludes synthetic `@duck.local` users.
4. Marketing campaign preview excludes non-opted-in users.
5. Production send creates Resend Contacts, Segment, and Broadcast with expected IDs.
6. Webhook events update campaign metrics in DuckSAT.

## Risks

- `@duck.local` users reduce effective reachable audience until real contact-email capture is added.
- Scheduling adds asynchronous operational complexity.
- Resend topic and webhook configuration errors can lead to misleading campaign states.
- Freeform email design requests may push the structured editor beyond v1 scope.

## Rollback Strategy

- The admin UI can be hidden by removing the dashboard card and route.
- The Resend integration layer is isolated and can be disabled behind an env flag.
- Campaign models are additive and can remain in the database even if the UI is rolled back.
- Webhook route can be disabled without affecting core product flows.

## Prerequisites Before Implementation

1. Put the Resend API key in environment variables only.
2. Verify `info@ducksat.com` as a valid Resend sender.
3. Add webhook secret and sender defaults to the deployment environment.
4. Decide whether credentials users will provide a real `contactEmail` immediately or in a later phase.

## Recommended Delivery Phases

### Phase 1

- campaign data model,
- admin UI shell,
- draft save,
- test send,
- deliverable recipient preview,
- basic branded template.

### Phase 2

- full Resend send pipeline,
- scheduled sends,
- webhook metrics,
- marketing topic enforcement.

### Phase 3

- collect real contact emails for synthetic-email users,
- opt-in UX,
- richer templates and saved presets,
- deeper campaign analytics.