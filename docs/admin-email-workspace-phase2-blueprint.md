# Admin Email Workspace Phase 2 Spec and Blueprint

## Goal

Refine the email workspace into four clear pages with a stronger operational overview:

1. Create Email
2. Assign Triggers
3. Send + Track
4. Email Overview

This phase removes coupon management from the trigger page, keeps coupon creation adjacent to email template creation, and adds a single page that shows the relationship between templates, automations, trigger types, delivery outcomes, recipients, and errors.

## User Requirements

- Coupon code adding must exist only on the Create Email page.
- Coupon tools should be visible near the template editor so the user does not need to scroll to the bottom of the page.
- The trigger page should focus on trigger mapping, not coupon management.
- There must be a fourth page that shows all email templates and the triggers attached to each one.
- The fourth page must also show delivery counts, recipient information, and errors.
- The flow should remain step-by-step and easy to navigate.

## Target Navigation

### 1. Create Email

Route: `/admin/email-create`

Primary purpose:
- Build and edit reusable templates
- Attach a coupon to the template
- Manage coupon codes in a persistent side panel
- Generate or refine copy with AI
- Preview the email in real time

Required changes:
- Move coupon manager into the main create-page layout without forcing a deep scroll
- Keep both coupon selection and coupon CRUD on this page
- Keep links to Assign Triggers and Send + Track nearby

### 2. Assign Triggers

Route: `/admin/email-automations`

Primary purpose:
- View all automations and their trigger definitions
- Assign a saved email template to a user action
- Edit trigger conditions and activation state

Required changes:
- Remove coupon CRUD from this page entirely
- Keep template selection and automation editing
- Improve visibility of saved automations and trigger types

### 3. Send + Track

Route: `/admin/email-campaigns`

Primary purpose:
- Send manual email campaigns to audience slices
- View recent outbound activity
- Keep inbox visibility accessible while Resend inbox work continues later

Required changes:
- Keep recent outbound activity visible
- Keep manual send flow intact
- Link clearly to the new Email Overview page

### 4. Email Overview

Route: `/admin/email-overview`

Primary purpose:
- Show every saved email template
- Show which automations use each template
- Show trigger type and trigger summary for each automation
- Show how many sends happened per automation
- Show recent recipients and send errors for each automation
- Give one place to audit the whole email system

Required data model for the page:
- Template metadata
- Automation metadata
- Template-to-automation relationship
- Trigger type and trigger filter summary
- Delivery totals: sent, queued, failed, total
- Recent delivery rows with recipient email, timestamps, resend ID, and error

## Data Requirements

### Existing sources to reuse

- `/api/admin/email-templates`
- `/api/admin/email-automations`
- `/api/admin/email-activity`

### New server capability needed

Add a joined overview data source that groups automations under templates and includes delivery summaries.

Recommended API:
- `/api/admin/email-overview`

Recommended response shape:
- `templates[]`
- each template includes `automations[]`
- each automation includes:
  - `triggerType`
  - `triggerFiltersSummary`
  - `isActive`
  - `deliverySummary`
  - `recentDeliveries[]`

## UX Blueprint

### Create Email page layout

- Left column: saved template list
- Main center column: template editor and preview
- Right sticky column: coupon picker and coupon manager

Outcome:
- Coupon work happens beside template work, not below it

### Assign Triggers page layout

- Left column: automation list with trigger labels and active state
- Main column: trigger editor and template assignment
- No coupon creation UI on this page

Outcome:
- This page becomes about behavior mapping, not promotions

### Email Overview page layout

- Top summary cards: templates, automations, active automations, failed sends
- Main list grouped by template
- Each template card shows:
  - template name
  - coupon attached or none
  - automation count
  - links to edit template or create trigger
- Each automation row shows:
  - automation name
  - trigger type
  - readable trigger summary
  - sent / queued / failed counts
  - recent recipients
  - latest error if present

Outcome:
- The admin can answer “what emails exist, what triggers use them, and what actually happened” from one page

## Acceptance Criteria

- Coupon CRUD appears only on `/admin/email-create`
- Coupon tools are visible without scrolling to the bottom of the page
- `/admin/email-automations` no longer contains coupon management
- `/admin/email-overview` exists and loads real joined data
- Overview page shows templates, related automations, trigger labels, send counts, recent recipients, and errors
- Navigation exposes all four pages clearly

## Implementation Order

1. Update shared email navigation to support four pages
2. Refactor Create Email layout so coupons sit in a visible side panel
3. Remove coupon CRUD from Assign Triggers
4. Add overview data helper and `/api/admin/email-overview`
5. Build `/admin/email-overview`
6. Validate routes, typecheck, and production build

## Validation Plan

- `get_errors` on all touched email workspace files
- `npx tsc --noEmit`
- `npm run build`
- route smoke tests for:
  - `/admin/email`
  - `/admin/email-create`
  - `/admin/email-automations`
  - `/admin/email-campaigns`
  - `/admin/email-overview`
