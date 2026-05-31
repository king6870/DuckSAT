# Admin Email Campaigns Spec

## Goal

Add an admin-only email campaign area inside DuckSAT so an authorized admin can:

- select recipients from the DuckSAT user base,
- compose branded emails with DuckSAT logo, rich sections, and CTA buttons,
- personalize content using user fields,
- send test emails,
- send immediately or schedule delivery,
- track campaign status and core delivery metrics,
- use Resend as the outbound provider.

The admin surface should live inside the existing admin dashboard and match current admin auth and UI patterns.

## Problem Statement

DuckSAT already has:

- an admin dashboard,
- admin-only API patterns,
- a user data dashboard with searchable users,
- a public DuckSAT logo asset at `public/duck-logo.svg`.

DuckSAT does not currently have:

- outbound email infrastructure,
- an admin campaign composer,
- a deliverable-contact model separate from auth identity,
- marketing consent and unsubscribe tracking,
- campaign persistence, preview, scheduling, or send logs.

There is also a major product constraint:

- credentials signups currently store synthetic emails in the form `username@duck.local` and those addresses are explicitly marked in code as never emailed.

That means the current `users.email` column is not a reliable mailing list. A campaign system that blindly targets all users would fail or send to invalid addresses.

## Current State

### Admin access

`src/app/admin/layout.tsx`

- guards admin pages with NextAuth session checks,
- authorizes via `ADMIN_EMAILS`.

### Admin dashboard landing page

`src/app/admin/page.tsx`

- renders dashboard cards,
- is the correct place to add a new Email Campaigns card.

### Existing user data source

`src/app/api/admin/data/users/route.ts`

- already provides paginated user lists,
- exposes fields useful for campaign filtering such as `createdAt`, `subscriptionPlan`, `subscriptionStatus`, `joinedViaQrCode`, `isTester`, `feedbackSubmittedAt`, `testCount`, and `lastActiveDate`.

### Credentials signup limitation

`src/app/api/auth/signup/route.ts`

- creates credentials users with `email: ${lowerUsername}@duck.local`,
- therefore many DuckSAT accounts do not currently have a deliverable email address.

### Branding asset

`public/duck-logo.svg`

- can be reused in branded email templates.

### Existing outbound email support

None in `src/` today.

## Product Requirements

### 1. New admin section

Add a new dashboard card on `/admin`:

- label: `Email Campaigns`
- description: `Compose and send branded emails to DuckSAT users`
- route: `/admin/email-campaigns`

### 2. Campaign management page

Create a new admin page at `/admin/email-campaigns` with four core areas:

1. Campaign list
2. Audience builder
3. Composer
4. Preview and send controls

### 3. Audience builder

The audience builder should support filtering by DuckSAT user data, at minimum:

- all deliverable users,
- paid users,
- free users,
- active subscribers,
- users created within a date range,
- QR-code signups,
- users with feedback submitted,
- active vs inactive users,
- include testers / exclude testers,
- manual include or exclude by email or user ID.

The builder must show:

- total matched users,
- deliverable users,
- non-deliverable users,
- skipped users by reason.

### 4. Deliverable recipient rules

DuckSAT must not treat every `users.email` value as sendable.

Recipient resolution rules:

1. If `contactEmail` exists, use it.
2. Else, if `users.email` is real and not `@duck.local`, use `users.email`.
3. Else, treat the user as non-deliverable and exclude them from the campaign.

The admin UI must visibly report these exclusions.

### 5. Campaign types

Support two campaign types:

- `marketing`
- `operational`

Rules:

- `marketing` campaigns require explicit opt-in and must include unsubscribe handling.
- `operational` campaigns may target deliverable account holders more broadly, but still must respect global suppression, bounced addresses, and provider unsubscribe state where applicable.

### 6. Composer requirements

The composer should support custom emails with branding, buttons, and reusable structure, without requiring raw HTML editing for v1.

Recommended v1 composer blocks:

- logo toggle,
- eyebrow or label text,
- headline,
- body rich text,
- hero image URL or hosted asset,
- primary CTA button,
- optional secondary CTA button,
- divider,
- feature or bullet section,
- footer text,
- unsubscribe footer for marketing campaigns.

The composer should also capture:

- internal campaign name,
- subject,
- preview text,
- from name,
- from email,
- reply-to email,
- send now or schedule later,
- optional test note.

### 7. Personalization

Admin-authored content should support friendly personalization tokens such as:

- `{{firstName}}`
- `{{fullName}}`
- `{{email}}`
- `{{username}}`
- `{{plan}}`
- `{{createdAt}}`
- `{{unsubscribeUrl}}`

DuckSAT should map these friendly tokens to the underlying Resend contact properties or unsubscribe tokens during render.

### 8. Test send

Before send, the admin must be able to send a preview email to an admin-controlled address.

The test send must:

- use the same template renderer as production sends,
- clearly label itself as a test,
- not create a production campaign send record.

### 9. Scheduling and send lifecycle

Campaigns should support these statuses:

- `draft`
- `scheduled`
- `sending`
- `sent`
- `partial`
- `failed`
- `canceled`

The dashboard should surface:

- created time,
- scheduled time,
- sent time,
- matched recipients,
- delivered recipients,
- failures,
- opens,
- clicks,
- unsubscribes,
- last provider error.

## Technical Architecture

## 1. Provider choice

Use Resend.

Use these Resend primitives:

- Contacts
- Segments
- Topics
- Broadcasts
- Webhooks

Rationale:

- Resend Broadcasts fit campaign sending better than raw single-email sends.
- Resend Segments fit campaign-scoped recipient groups.
- Resend Topics fit marketing opt-in and unsubscribe behavior.
- Resend Contacts fit personalization properties.

## 2. Rendering model

Use React email templates rather than freeform raw HTML as the primary renderer.

Recommended packages:

- `resend`
- `@react-email/components`
- `@react-email/render`

Why:

- branded layouts are easier to keep consistent,
- CTA buttons and sections are deterministic,
- preview and production rendering can share the same code,
- structured content is easier to validate and sanitize than arbitrary HTML.

## 3. Suggested new server modules

- `src/lib/resend.ts`
- `src/lib/email-campaigns/contact-resolution.ts`
- `src/lib/email-campaigns/render-campaign-email.tsx`
- `src/lib/email-campaigns/resend-sync.ts`
- `src/lib/email-campaigns/send-test-email.ts`
- `src/lib/email-campaigns/send-campaign.ts`

## 4. Suggested database changes

### User contact fields

Add deliverable-contact and consent fields to `User`:

- `contactEmail String?`
- `contactEmailVerifiedAt DateTime?`
- `contactEmailSource String?`
- `marketingOptInAt DateTime?`
- `marketingOptOutAt DateTime?`
- `resendContactId String?`

Behavior:

- `contactEmail` is the preferred outbound address for campaigns.
- Existing non-synthetic `users.email` remains a fallback.
- Credentials users can later provide `contactEmail` even though auth still uses `@duck.local`.

### Campaign persistence

Add a new `EmailCampaign` model with fields such as:

- `id`
- `name`
- `kind`
- `status`
- `subject`
- `previewText`
- `fromName`
- `fromEmail`
- `replyTo`
- `contentJson`
- `htmlBody`
- `textBody`
- `filtersJson`
- `resendSegmentId`
- `resendBroadcastId`
- `resendTopicId`
- `matchedRecipientCount`
- `deliverableRecipientCount`
- `deliveredCount`
- `failedCount`
- `openedCount`
- `clickedCount`
- `unsubscribedCount`
- `scheduledAt`
- `sentAt`
- `lastError`
- `createdByUserId`
- `updatedByUserId`
- `createdAt`
- `updatedAt`

### Recipient snapshot

Add a new `EmailCampaignRecipient` model so the app stores a snapshot of who a campaign intended to reach:

- `id`
- `campaignId`
- `userId`
- `resolvedEmail`
- `isDeliverable`
- `skipReason`
- `resendContactId`
- `deliveryStatus`
- `openedAt`
- `clickedAt`
- `bouncedAt`
- `unsubscribedAt`
- `providerMessageId`
- `createdAt`
- `updatedAt`

This snapshot allows the admin UI to explain exactly why users were included or skipped.

## 5. Resend model

### Contacts

Each deliverable DuckSAT recipient should map to a Resend Contact with properties such as:

- `user_id`
- `full_name`
- `first_name`
- `username`
- `plan`
- `created_at`
- `joined_via_qr`

### Topics

Recommended topics:

- `DuckSAT Marketing`
- `DuckSAT Product Updates`

For marketing:

- use a topic with `defaultSubscription=opt_out`,
- only explicitly opted-in contacts should be subscribed.

For operational:

- either use a separate topic or direct provider sends depending on final compliance policy,
- still respect provider suppression and unsubscribe state when possible.

### Segments

Create a campaign-scoped Resend Segment for each sendable audience snapshot.

Example:

- `DuckSAT Campaign cmp_xxx – Paid Users May 2026`

Why campaign-scoped segments are preferred over one global segment:

- the audience snapshot remains stable for auditability,
- send history matches the exact intended cohort,
- later edits to user filters do not retroactively change old campaign scope.

### Broadcasts

Use Resend Broadcasts for production campaign sends.

Broadcast inputs should include:

- `segmentId`
- `from`
- `subject`
- `html`
- `text`
- `name`
- `topicId` when applicable
- `send: true`
- `scheduledAt` for scheduled sends

## 6. Admin UI plan

### Dashboard card

Add a new card to `src/app/admin/page.tsx` linking to `/admin/email-campaigns`.

### New page

Create `src/app/admin/email-campaigns/page.tsx`.

Recommended layout:

- left rail or top tabs for `Campaigns`, `Audience`, `Compose`, `Preview`, `History`,
- summary pills for matched vs deliverable recipients,
- compose panel and live preview side by side on desktop,
- send controls pinned near the top-right.

### Editor model

Use structured JSON blocks rather than arbitrary HTML input for v1.

Benefits:

- consistent branding,
- safer content generation,
- predictable rendering,
- easier CTA/button support,
- easier mobile preview.

### Branding defaults

Default brand values:

- logo: `public/duck-logo.svg`
- sender name: `DuckSAT`
- sender email: `info@ducksat.com`
- primary color: existing DuckSAT brand color from the web UI
- footer: support and unsubscribe text

## 7. API design

Suggested admin endpoints:

- `GET /api/admin/email-campaigns`
- `POST /api/admin/email-campaigns`
- `GET /api/admin/email-campaigns/[id]`
- `PATCH /api/admin/email-campaigns/[id]`
- `POST /api/admin/email-campaigns/[id]/preview`
- `POST /api/admin/email-campaigns/[id]/test`
- `POST /api/admin/email-campaigns/[id]/send`
- `POST /api/admin/email-campaigns/[id]/schedule`
- `POST /api/admin/email-campaigns/[id]/cancel`
- `GET /api/admin/email-campaigns/[id]/recipients`
- `POST /api/admin/email-campaigns/[id]/sync-resend`

Suggested public or provider callback endpoint:

- `POST /api/resend/webhook`

All admin endpoints must reuse the existing admin session and `ADMIN_EMAILS` authorization pattern.

## 8. Recipient eligibility and consent logic

### Deliverability

Users are not eligible when:

- their only email is `@duck.local`,
- their resolved contact email is missing,
- the address has bounced,
- the contact is globally unsubscribed,
- the selected campaign type requires opt-in and the user is not opted in.

### Marketing eligibility

Marketing campaigns should require:

- deliverable contact email,
- positive marketing opt-in,
- not globally unsubscribed,
- not topic-unsubscribed.

### Operational eligibility

Operational campaigns should require:

- deliverable contact email,
- not globally suppressed or bounced.

## 9. Compliance and safety

This feature becomes user-facing outbound messaging, so it must include:

- unsubscribe behavior,
- suppression handling,
- no client-side exposure of `RESEND_API_KEY`,
- no sending to known synthetic emails,
- server logs that omit raw API keys and full provider payloads when unnecessary,
- safe defaults for marketing consent.

The admin UI should show a warning banner if the selected audience includes non-deliverable or non-consented users.

## 10. Environment variables

Add these server-side env vars:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL=info@ducksat.com`
- `RESEND_FROM_NAME=DuckSAT`
- `RESEND_REPLY_TO_EMAIL=info@ducksat.com`
- `RESEND_WEBHOOK_SECRET`
- `RESEND_MARKETING_TOPIC_ID`
- `RESEND_PRODUCT_UPDATES_TOPIC_ID` if operational campaigns use topics
- `RESEND_EMAILS_ENABLED=true`

Do not commit real keys into the repo.

## Acceptance Criteria

### Admin access

- Only existing admins can access `/admin/email-campaigns` and related API routes.

### Audience handling

- The audience builder can preview matched recipients from DuckSAT user data.
- Synthetic `@duck.local` users are automatically excluded and visibly counted.
- The admin can filter by at least plan, date joined, QR source, and tester status.

### Composer

- The admin can compose a branded email with DuckSAT logo, text content, and at least one CTA button.
- The admin can save a draft and reopen it later.
- The admin can send a test email before production send.

### Sending

- A campaign can be sent via Resend without exposing secrets to the client.
- Marketing campaigns honor opt-in and unsubscribe rules.
- Scheduled sends persist and execute with correct metadata.

### Tracking

- The admin can view send status and core metrics for each campaign.
- Webhook events update campaign delivery state and recipient snapshot state.

## Validation Plan

### Local and staging

1. Seed one deliverable Google user, one synthetic credentials user, and one opted-out user.
2. Open the admin campaign page.
3. Build an audience of all users.
4. Confirm counts show total matched, deliverable, and skipped synthetic users.
5. Save a draft.
6. Send a test email to an admin address.
7. Confirm the branded email renders correctly with logo and button.

### Marketing consent

1. Create a marketing campaign.
2. Confirm only opted-in contacts are eligible.
3. Confirm unsubscribed contacts are excluded.

### Production send

1. Send a small campaign to a safe internal segment.
2. Confirm Resend Contact, Segment, Topic, and Broadcast records are created as expected.
3. Confirm webhook events flow back into DuckSAT.
4. Confirm admin history updates without manual refresh issues.

## Risks

- The current credentials auth model means many DuckSAT users are not actually emailable today.
- Campaign sending without explicit marketing consent can create compliance and deliverability problems.
- Provider webhooks introduce new operational dependencies.
- Campaign-scoped Resend segments can accumulate over time and may need cleanup policy.

## Non-Goals

- Full drag-and-drop email builder parity with a dedicated ESP.
- End-user inbox management UI in v1.
- Automatic import of all historical users into a marketing audience without consent review.
- Arbitrary custom HTML editing in v1.

## Recommended Rollout

### Phase 1

- Admin campaign drafts
- deliverable-recipient preview
- test sends
- branded templates
- small internal sends

### Phase 2

- production campaigns
- webhook-backed metrics
- scheduling
- marketing topic enforcement

### Phase 3

- collect real contact emails for credentials users
- add explicit marketing opt-in UX to onboarding or settings
- expand segmentation and saved templates