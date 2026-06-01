# Admin Email Workspace Spec and Blueprint

## Goal

Replace the overloaded email admin flow with three clear destinations:

1. Create Email
2. Assign Triggers
3. Send + Track

This removes the current navigation ambiguity where composing, coupons, triggers, manual sends, local history, and inbound inbox details are split across multiple pages without a clear order of operations.

## User Problem

- The inbox feels broken because it is treated like a separate utility instead of part of one operational flow.
- Coupon codes were managed from the trigger page instead of the email creation page.
- Manual sends and server-side automation deliveries were not presented together.
- The email tools did not communicate a simple workflow for the admin user.

## Target Information Architecture

### 1. Create Email

Route: `/admin/email-create`

Purpose:
- Build reusable email templates
- Preview the rendered email
- Generate draft copy with AI
- Create and edit coupon codes
- Attach a coupon to the email at creation time

Primary data sources:
- `/api/admin/email-templates`
- `/api/admin/promo-codes`
- `/api/admin/email-campaigns/preview`
- `/api/admin/email-automations/generate`

### 2. Assign Triggers

Route: `/admin/email-automations`

Purpose:
- Assign saved or edited emails to real product events
- Support triggers like `practice_test_completed`, `drill_completed`, `page_dwell`, and `user_event`
- Keep unsubscribe behavior on every live send

Primary data sources:
- `/api/admin/email-automations`
- `/api/admin/email-templates`
- `/api/admin/email-campaigns/preview`

### 3. Send + Track

Route: `/admin/email-campaigns`

Purpose:
- Filter audience and send manual admin emails
- Review browser-local manual campaign history
- Review server-side automation delivery activity
- Keep recent inbound inbox visibility on the same page

Primary data sources:
- `/api/admin/email-campaigns/audience`
- `/api/admin/email-campaigns/preview`
- `/api/admin/email-campaigns/send`
- `/api/admin/email-activity`
- `/api/admin/inbound-emails`

## Inbound Inbox Detail View

Route: `/admin/inbound-emails`

Purpose:
- Inspect raw inbound message details
- Review attachments, stored HTML/text body, and forward outcome
- Act as the deep-detail page for Send + Track

Primary data sources:
- `/api/admin/inbound-emails`
- `/api/admin/inbound-emails/[id]`
- `/api/resend/inbound`

## What Changed

- Added a shared Email Workspace navigation component with the three primary actions.
- Added a dedicated Email Workspace landing page at `/admin/email`.
- Added a dedicated Create Email page at `/admin/email-create`.
- Kept coupon management on the Create Email page.
- Repositioned `/admin/email-automations` as the Assign Triggers page.
- Repositioned `/admin/email-campaigns` as the Send + Track page.
- Added `/api/admin/email-activity` for recent server-side automation delivery tracking.
- Added clearer inbox empty-state diagnostics that point admins to the Resend inbound webhook route.

## Acceptance Criteria

- Admin can reach the email system from one obvious dashboard button.
- Admin sees exactly three primary email actions before doing any work.
- Coupon creation and editing is available on the Create Email page.
- Trigger assignment is focused on event-to-email mapping.
- Send + Track shows both outbound activity and recent inbox visibility.
- Inbox empty states explain what to verify instead of appearing silently broken.

## Known Gap

Manual send history is still stored in browser localStorage on the Send + Track page.

That means:
- it is not shared across devices or browsers
- it is not queryable from the server
- it is not yet unified with automation delivery records in the database

## Recommended Next Phase

Add a database-backed outbound activity table for manual admin sends.

Suggested model:
- `AdminEmailSend`
- fields: `id`, `templateId`, `subject`, `audienceFiltersJson`, `mode`, `sentCount`, `deliverableCount`, `skippedCount`, `resendBatchId`, `status`, `error`, `createdBy`, `createdAt`

Phase 2 outcome:
- Send + Track becomes the single source of truth for both manual and automated outbound activity.
- Inbox and send history can be combined into one server-backed operational timeline.

## Operational Notes

- Resend inbound mail is expected at `/api/resend/inbound`.
- The local environment must define `RESEND_WEBHOOK_SECRET`.
- The inbox depends on the receiving domain and webhook being correctly configured in Resend.
- The current forward target defaults to `ducksat1600@gmail.com` unless `RESEND_INBOUND_FORWARD_TO` is overridden.