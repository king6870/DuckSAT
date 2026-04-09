# Feedback Widget — Full Specification
**Status:** Pending implementation  
**Do not touch code until explicitly instructed.**

---

## 1. Overview

A persistent, globally visible **Feedback** button floats in the bottom-right corner of every page on ducksat.com. Clicking it opens a modal where the user can submit a 1–5 star rating and an optional text review (max 500 characters).

Separately, an **auto-popup** system nudges users who have never submitted a review. The popup appears automatically after 5 minutes of first arriving on the site, and then every 20 minutes thereafter until the user either submits a review or closes their browser session for good (and the cycle resets on the next visit until they submit).

Once a user submits a review (through either the button or the auto-popup), **all popup logic stops permanently** for that user account (or device for anonymous users).

---

## 2. Scope

| Area | In scope |
|---|---|
| Floating feedback button | ✅ |
| Star rating (1–5) | ✅ |
| Text review (0–500 chars) | ✅ |
| Auto-popup after 5 min | ✅ |
| Auto-popup every 20 min after dismissal | ✅ |
| Permanent stop after submission | ✅ |
| Authenticated user persistence (DB) | ✅ |
| Anonymous user persistence (localStorage) | ✅ |
| Admin view of reviews | ❌ (future) |
| Public display of reviews | ❌ (future) |

---

## 3. UI Components

### 3.1 Floating Button

- **Position:** Fixed, `bottom-6 right-6`, `z-index: 9999` (above all content, below modals)
- **Visible on:** Every page (mounted in `src/app/layout.tsx` inside `<AuthSessionProvider>`)
- **HTML element:** `<button>`
- **Appearance:**
  - Pill-shaped: `rounded-full`
  - Background: `bg-indigo-600`, hover `bg-indigo-700`
  - Text: `"✦ Feedback"` — white, `text-sm font-semibold`
  - Shadow: `shadow-lg hover:shadow-xl`
  - Transition: `transition-all duration-200`
  - Padding: `px-5 py-3`
  - Icon: Star icon (lucide `Star`, 14px) to the left of "Feedback" text
- **Behavior:**
  - Always visible, does NOT hide when auto-popup is showing
  - Clicking it marks `hasManuallyOpenedFeedback = true` (suppresses the 5-min popup only — see §5)
  - If a review has already been submitted, the button still shows but the modal shows a "Thanks for your feedback!" message instead of the form

### 3.2 Feedback Modal (triggered by button click)

A centered overlay modal:

- **Overlay:** `fixed inset-0 bg-black/50 z-[10000]`, click outside = close (same as X)
- **Modal box:** `bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4`
- **Close button:** `×` top-right corner, `aria-label="Close feedback"`, always visible

#### Content — Normal state (no prior review):

```
Title:    "How's your experience?"          (text-xl font-bold text-gray-900)
Subtitle: "Your feedback helps us improve." (text-sm text-gray-500 mb-6)

[ ★ ★ ★ ★ ★ ]   ← interactive star row (see §3.3)

<textarea>
  placeholder: "Tell us what you think... (optional)"
  maxlength:   500
  rows:        4
  resize:      vertical, max-height: 200px
</textarea>

Character counter: "X / 500" right-aligned below textarea
                   turns red when X >= 450

[ Submit Feedback ]   ← primary button, disabled until at least 1 star selected
                        bg-indigo-600 hover:bg-indigo-700, full width, rounded-lg
```

#### Content — Already reviewed state:

```
Checkmark icon (green, 48px)
Title:    "Thanks for your feedback!"
Subtitle: "You've already submitted a review. We really appreciate it."
[ Close ]
```

#### Content — Submission success state (just submitted):

```
Checkmark icon (green, 48px, animate-scale-in)
Title:    "Thank you! 🎉"
Subtitle: "Your feedback means a lot to us."
```
Auto-closes after 2 seconds then modal disappears.

### 3.3 Star Rating Component

- 5 stars rendered as SVG star icons (lucide `Star`)
- **Empty state:** outlined, `text-gray-300`
- **Hovered state:** filled, `text-yellow-400` (hover highlights all stars from 1 to cursor)
- **Selected state:** filled, `text-yellow-400`
- Stars are `<button>` elements with `aria-label="Rate X out of 5 stars"`
- Clicking a star sets the rating; clicking the already-selected star **deselects** it (resets to 0)
- Size: `w-8 h-8`, gap `gap-2`, centered in modal

### 3.4 Auto-Popup Modal

Identical in content and appearance to the Feedback Modal (§3.2), with one addition:

- A **dismissal CTA** at the bottom below the Submit button:  
  `"Maybe later"` — `text-sm text-gray-400 hover:text-gray-600 underline cursor-pointer`  
  Clicking "Maybe later" or the `×` both trigger the 20-min reschedule (§5.3)
- The overlay click does **NOT** close the auto-popup (only the × and "Maybe later" do)
  - This prevents accidental dismissal

---

## 4. Data Model

### 4.1 New Prisma Model — `UserFeedback`

```prisma
model UserFeedback {
  id          String   @id @default(cuid())
  userId      String?  // null for anonymous submissions
  sessionId   String?  // anonymous identifier from localStorage
  rating      Int      // 1–5
  review      String?  // optional text, max 500 chars
  submittedAt DateTime @default(now())
  userAgent   String?  // browser UA for context
  pageUrl     String?  // which page they were on when submitted

  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@map("user_feedback")
}
```

### 4.2 Changes to `User` model

Add two fields (no migration breaking changes):

```prisma
  feedbackSubmittedAt  DateTime?  // null = never submitted; set = submitted at this time
  // (no field for popup timing — that lives in localStorage for perf reasons)

  feedback    UserFeedback[]
```

**Why no `popupNextShowAt` on User?**  
Popup scheduling is per-browser-session, not per-account. A user logged in on two devices should get the popup on both. Storing it only in localStorage is intentional and sufficient.

### 4.3 `localStorage` Keys

All localStorage keys are prefixed `ducksat_feedback_`:

| Key | Type | Purpose |
|---|---|---|
| `ducksat_feedback_submitted` | `"true"` or absent | Anonymous: has ever submitted |
| `ducksat_feedback_session_id` | `string (cuid)` | Anonymous user identifier |
| `ducksat_feedback_first_visit` | ISO timestamp string | When the user first arrived (set once, never updated) |
| `ducksat_feedback_next_popup` | ISO timestamp string | When the next popup is scheduled |
| `ducksat_feedback_manually_opened` | `"true"` or absent | Opened the button manually within first 5 min |

**For authenticated users:** `ducksat_feedback_submitted` in localStorage is still used as a **cache** (so we don't have to hit the API every page load). It is verified against the DB on the first API response and synced if out of date.

---

## 5. Popup Timing Logic

### 5.1 State Machine

```
States:
  IDLE           → Timer running, no popup shown yet
  POPUP_SHOWN    → Popup currently visible
  DISMISSED      → User X'd or "Maybe later", popup closed, reschedule pending
  SUBMITTED      → User submitted review — terminal state, no more popups ever
```

### 5.2 Initial Schedule (First Visit)

On **every page load** (inside the `FeedbackWidget` component's `useEffect`):

1. Read `ducksat_feedback_first_visit` from localStorage.
   - If absent: set it to `Date.now()` (this is `T₀`).
2. Read `ducksat_feedback_submitted`.
   - If `"true"` → **SUBMITTED** state, stop all popup logic immediately.
3. For authenticated users: call `GET /api/feedback/status` (see §6.1).
   - If response `{ submitted: true }` → set localStorage `submitted = "true"`, enter **SUBMITTED** state.
4. Read `ducksat_feedback_next_popup`.
   - If absent → schedule first popup for `T₀ + 5 minutes`.
   - If present → use that timestamp.
5. Read `ducksat_feedback_manually_opened`.
   - If `"true"` AND the current time is still within the first 5 minutes from `T₀` → **skip** the 5-min popup (move `next_popup` to `T₀ + 25 minutes`).
   - Once past the 5-minute mark, `manually_opened` has no further effect.

### 5.3 Popup Trigger Loop

A `setInterval` runs every **30 seconds** (not every second, to avoid battery drain):

```
every 30s:
  if state === SUBMITTED → clearInterval, return
  if Date.now() >= next_popup_time:
    show auto-popup
    state = POPUP_SHOWN
```

### 5.4 On Manual Open (clicking the Feedback button)

```
if within first 5 minutes from T₀:
  set localStorage ducksat_feedback_manually_opened = "true"
  if next_popup has not yet fired:
    move next_popup to T₀ + 25 minutes
      (5 min initial wait + 20 min interval, since they engaged)
```

### 5.5 On Auto-Popup Dismiss (× or "Maybe later")

```
next_popup = Date.now() + 20 minutes
set localStorage ducksat_feedback_next_popup = next_popup.toISOString()
state = DISMISSED
hide popup
```

### 5.6 On Submission (from either button modal or auto-popup)

```
state = SUBMITTED
set localStorage ducksat_feedback_submitted = "true"
remove localStorage ducksat_feedback_next_popup (no longer needed)
hide popup
show success state in modal (2s then auto-close)
clearInterval (stop the 30s loop)
```

### 5.7 Timeline Example

```
T+0:00  User arrives → T₀ set, next_popup = T₀+5min
T+0:03  User opens feedback button manually → manually_opened = true
          next_popup moves to T₀+25min (since still within first 5min)
T+0:25  Auto-popup fires
T+0:25  User clicks × → next_popup = T+0:25 + 20min = T+0:45
T+0:45  Auto-popup fires
T+0:45  User clicks × → next_popup = T+1:05
T+1:05  Auto-popup fires → user submits → SUBMITTED state, no more popups
```

---

## 6. API Endpoints

### 6.1 `GET /api/feedback/status`

**Auth:** Optional (no auth = anonymous, return based on sessionId)  
**Purpose:** Check if feedback was already submitted for this user/session

**Request:**
```
GET /api/feedback/status
Headers: Cookie (nextauth session, if logged in)
Query: ?sessionId=<cuid>   (for anonymous users)
```

**Response 200:**
```json
{
  "submitted": true | false,
  "submittedAt": "2026-04-07T12:00:00Z" | null
}
```

**Logic:**
- If authenticated → check `User.feedbackSubmittedAt IS NOT NULL`
- If anonymous → check `UserFeedback` table for matching `sessionId`

### 6.2 `POST /api/feedback`

**Auth:** Optional  
**Purpose:** Submit a new review

**Request body:**
```json
{
  "rating": 4,           // integer 1–5, required
  "review": "...",       // string, optional, max 500 chars
  "sessionId": "clxxx",  // required for anonymous users
  "pageUrl": "/practice-tests"  // optional, current pathname
}
```

**Validation (server-side):**
- `rating` must be integer 1–5, if missing → 400
- `review` if present must be string ≤ 500 chars, if longer → 400 (trim is not applied server-side — should fail loudly)
- `sessionId` required if not authenticated → 400
- Rate limit: 1 submission per user/sessionId (check before inserting)
  - If already submitted → return 409 `{ error: "already_submitted" }`
- No auth required — anonymous users can submit

**Response 201:**
```json
{
  "success": true,
  "feedbackId": "clyyy"
}
```

**Side effects:**
- Create `UserFeedback` record
- If authenticated: set `User.feedbackSubmittedAt = now()`

**Error responses:**

| Code | Body | Condition |
|---|---|---|
| 400 | `{ error: "invalid_rating" }` | rating missing or out of range |
| 400 | `{ error: "review_too_long" }` | review > 500 chars |
| 400 | `{ error: "session_required" }` | anon user without sessionId |
| 409 | `{ error: "already_submitted" }` | duplicate submission |
| 500 | `{ error: "server_error" }` | DB failure |

---

## 7. Files to Create / Modify

> ⚠️ DO NOT create or modify any of these until explicitly instructed.

### New files:
```
src/components/FeedbackWidget.tsx       ← main component (button + modals + timer)
src/components/FeedbackStars.tsx        ← reusable star rating sub-component
src/app/api/feedback/route.ts           ← POST /api/feedback
src/app/api/feedback/status/route.ts    ← GET /api/feedback/status
```

### Modified files:
```
prisma/schema.prisma                    ← add UserFeedback model + User.feedbackSubmittedAt
src/app/layout.tsx                      ← mount <FeedbackWidget /> inside AuthSessionProvider
```

### New migration:
```
prisma/migrations/<timestamp>_add_user_feedback/migration.sql
```

---

## 8. Component Architecture

```
layout.tsx
└── <AuthSessionProvider>
    └── <FeedbackWidget />        ← single instance, always mounted
        ├── Floating button       ← always visible
        ├── FeedbackModal         ← shown when button clicked (or already-reviewed state)
        │   └── FeedbackStars     ← star row sub-component
        └── AutoPopupModal        ← shown by timer (same form content, different dismiss behavior)
            └── FeedbackStars     ← same sub-component
```

`FeedbackWidget` manages all state:
```ts
type FeedbackState = 'idle' | 'button-modal-open' | 'autopopup-open' | 'submitted'

useState: feedbackState: FeedbackState
useState: rating: number (0 = unset)
useState: reviewText: string
useState: isSubmitting: boolean
useState: hasEverSubmitted: boolean  ← drives "already reviewed" modal content
```

---

## 9. Edge Cases & Rules

| Scenario | Behavior |
|---|---|
| User opens button modal, does NOT submit, closes | Popup timer is unchanged (manually_opened flag set if within 5min) |
| User has two tabs open | Each tab runs its own timer independently; submitting in one tab will NOT suppress the other tab's popup mid-session (acceptable, they'll just dismiss it) |
| User submits on desktop, visits on mobile (same account) | Mobile checks DB via `/api/feedback/status` → gets `submitted: true` → no popup |
| Anonymous user submits, then signs up | The anonymous submission stays. After sign-up, `feedbackSubmittedAt` is NOT retroactively set (a new logged-in submission would be needed — or we could match by sessionId during sign-up, but this is out of scope for v1) |
| User navigates between pages | `FeedbackWidget` is mounted once in layout. Page navigation does not reset the timer. |
| User refreshes page | `first_visit` timestamp is preserved in localStorage, timer resumes from where it left off |
| Page load takes > 5 min (unlikely) | Popup fires immediately on mount |
| User's browser has localStorage disabled | Popup logic gracefully degrades: no popup is ever shown (we cannot store timing state). The button still works and submission is stored in DB if authenticated. |
| Rating submitted = 0 (no star selected) | Submit button is disabled; server also rejects rating < 1 |
| User submits empty review (no text) | Allowed — only rating is required |
| Network error on submit | Show inline error: `"Something went wrong. Please try again."` — do not change popup timer |
| Already submitted (409 from API) | Sync local state to `hasEverSubmitted = true`, show "already reviewed" message |

---

## 10. Accessibility

- Floating button: `aria-label="Open feedback form"`, `role="button"`
- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="feedback-modal-title"`
- Focus trap inside modal when open (Tab cycles within modal only)
- Focus returns to floating button when modal closes
- Star buttons: `aria-label="Rate {n} out of 5 stars"`, `aria-pressed={isSelected}`
- Escape key closes button modal (NOT auto-popup — intentional, to prevent accidental dismissal with keyboard)
- Textarea: `aria-label="Write your review"`, `aria-describedby="char-counter"`
- Character counter: `id="char-counter"`, `aria-live="polite"` (announces changes to screen readers)

---

## 11. Visual Design Decisions

| Element | Decision | Rationale |
|---|---|---|
| Button position | Bottom-right | Standard UX convention; won't overlap back button (bottom-left) |
| z-index 9999 (button) / 10000 (modal) | Above all page content, below nothing | Ensures always visible |
| Auto-popup blocks outside click | Prevents accidental dismissal; user must explicitly act | |
| 5-min initial delay | Short enough to catch engaged users; long enough to not annoy first-timers | |
| 20-min repeat interval | Not too aggressive; still persistent enough to collect feedback | |
| Max 500 chars | Same limit as Google/App Store; meaningful without being overwhelming | |
| Star deselect on re-click | Standard expected behavior | |
| No star deselect on re-click if switching | Clicking star 3 when star 5 is selected → moves to 3, doesn't deselect | |
| Success auto-close (2s) | Feels polished; user doesn't need to manually close after submission | |

---

## 12. Non-Goals (explicitly out of scope for v1)

- Admin dashboard to view/filter/export reviews
- Public-facing review display (e.g., on homepage or pricing page)
- Ability to edit or delete a submitted review
- Multiple reviews per user (one-and-done)
- Review moderation / flagging
- Rich text in reviews
- Photo/attachment upload
- Notification email to admin on new review
- NPS score (promoter/passive/detractor) — just stars for now

---

## 13. Implementation Order

When instructed to implement, follow this order to avoid breaking changes:

1. **Prisma schema** — add `UserFeedback` model and `User.feedbackSubmittedAt` field
2. **DB migration** — `npx prisma migrate dev --name add_user_feedback`
3. **`FeedbackStars.tsx`** — isolated, no dependencies
4. **`POST /api/feedback`** — server-only, testable with curl
5. **`GET /api/feedback/status`** — server-only
6. **`FeedbackWidget.tsx`** — mount last, depends on APIs and sub-components
7. **`layout.tsx` patch** — one line: add `<FeedbackWidget />` after `<AnalyticsProvider>`
8. **Build + test locally** — verify localStorage logic with browser devtools (manually set `ducksat_feedback_first_visit` to 5 min ago to test popup)
9. **Deploy**

---

*Spec version 1.0 — April 8, 2026*
