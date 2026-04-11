# Admin Data Dashboard — Full Specification

**Status:** Pending implementation  
**Do not touch code until explicitly instructed.**

---

## 1. Overview

A new section of the existing `/admin` dashboard that gives admin accounts a real-time, readable view of **live database data** — primarily user feedback submissions and user activity metrics (practice tests taken, time spent, subscription status). Data updates on every page load (no WebSocket required). Admins can filter, sort, and export data.

Auth gate: **`ADMIN_EMAILS` allowlist** (same mechanism used by all existing admin routes — `lionvihaan@gmail.com` and `kingjacobisthegoat@gmail.com`). Non-admins are never shown the page.

---

## 2. Scope

| Area | In scope |
|---|---|
| Feedback submissions viewer | ✅ |
| User list with activity metrics | ✅ |
| Per-user drill-down | ✅ |
| Summary stats cards (totals / averages) | ✅ |
| Sorting & filtering (client-side) | ✅ |
| CSV export | ✅ |
| Pagination (50 rows per page) | ✅ |
| Admin-side delete of feedback entries | ✅ |
| Link from existing `/admin` dashboard | ✅ |
| Real-time push / WebSocket | ❌ (future) |
| Editing user subscription data | ❌ (future) |
| Sending emails to users from the dashboard | ❌ (future) |
| Charts / graphs | ❌ (future) |

---

## 3. Navigation

### 3.1 Link on existing `/admin` page

Add a new card to the existing admin dashboard grid at `src/app/admin/page.tsx`:

```
┌────────────────────────────────┐
│  📊                            │
│  Data Dashboard                │
│  Users, feedback & activity    │
└────────────────────────────────┘
```

Links to `/admin/data`.

### 3.2 Internal tabs at `/admin/data`

Two tabs at the top of the page:

```
[ Feedback ]   [ Users ]
```

Default tab: **Feedback**.

---

## 4. Feedback Tab (`/admin/data` — default)

### 4.1 Summary Cards (top row)

Four stat cards in a row:

| Card | Value |
|---|---|
| Total Reviews | Count of all `user_feedback` rows |
| Average Rating | Mean of all `rating` values, formatted as `4.2 ★` |
| Reviews This Week | Count where `submittedAt >= 7 days ago` |
| Reviews with Text | Count where `review IS NOT NULL AND review != ''` |

### 4.2 Filters

Inline filter bar above the table:

- **Rating filter:** Dropdown — `All`, `5 ★`, `4 ★`, `3 ★`, `2 ★`, `1 ★`
- **Text filter:** Dropdown — `All`, `With text`, `Rating only`
- **Date range:** Two date inputs — `From` / `To` (filter by `submittedAt`)
- **Search:** Free text input — searches inside `review` text
- **[ Refresh ]** button — re-fetches from API
- **[ Export CSV ]** button — downloads all matching rows (not just current page)

### 4.3 Table

Columns:

| Column | Source | Notes |
|---|---|---|
| Submitted | `submittedAt` | Formatted as `Apr 9, 2026 3:41 PM` |
| User | `user.name` + `user.email` | Two lines: name bold, email small gray. `Anonymous` if `userId = null` |
| Rating | `rating` | Rendered as filled ★ icons |
| Review | `review` | Truncated to 120 chars with "Show more" expand |
| Page | `pageUrl` | Monospace, gray |
| Actions | — | `🗑 Delete` button (with confirmation dialog) |

**Sort:** Clicking column header toggles asc/desc. Default: `submittedAt DESC`.

**Pagination:** 50 rows per page. `← Previous` / `Next →` buttons + `Page X of Y` label.

### 4.4 Delete Confirmation

Clicking `🗑 Delete` opens a small inline confirmation:
```
"Delete this review? This cannot be undone."
[ Cancel ]  [ Delete ]
```
On confirm: `DELETE /api/admin/data/feedback/:id` → row removed from table optimistically.

---

## 5. Users Tab (`/admin/data?tab=users`)

### 5.1 Summary Cards (top row)

| Card | Value |
|---|---|
| Total Users | Count of all `users` rows |
| Paid Users | Count where `subscriptionPlan IN ('monthly', 'yearly')` AND `subscriptionStatus = 'active'` |
| Free Users | Count where `subscriptionPlan = 'free'` |
| New This Week | Count where `createdAt >= 7 days ago` |

### 5.2 Filters

- **Plan filter:** Dropdown — `All`, `Free`, `Monthly`, `Yearly`, `Tester`
- **Status filter:** Dropdown — `All`, `Active`, `Canceled`, `Trial`, `None`
- **Sort by:** Dropdown — `Joined (newest)`, `Joined (oldest)`, `Tests taken`, `Time spent`, `Last active`
- **Search:** Free text — searches `name` and `email`
- **[ Refresh ]** + **[ Export CSV ]** buttons

### 5.3 Table

Columns:

| Column | Source | Notes |
|---|---|---|
| User | `name` + `email` | Name bold, email small gray |
| Joined | `createdAt` | `Apr 9, 2026` |
| Plan | `subscriptionPlan` + `subscriptionStatus` | Badge: `Free` gray, `Monthly` blue, `Yearly` indigo, `Tester` yellow, `Canceled` red |
| Tests Taken | `COUNT(testResults)` | Number of completed `TestResult` rows for this user |
| Time on Site | Derived | Total time in minutes from `UserDailyActivity.activeMinutes` summed across all days |
| Last Active | Max of `UserDailyActivity.date` | Formatted as relative time: `2 days ago` |
| Actions | — | `👁 View` button → opens user detail panel |

**Pagination:** 50 rows per page.

### 5.4 User Detail Panel

Clicking `👁 View` opens a **side panel** (slides in from the right, overlapping the page, with a backdrop):

```
┌──────────────────────────────────────┐
│  ← Back     John Doe                 │
│             john@gmail.com           │
│                                      │
│  ACCOUNT                             │
│  Joined: Apr 1, 2026                 │
│  Plan: Monthly (Active)              │
│  Period ends: May 1, 2026            │
│  Promo code used: DUCK19             │
│  isTester: No                        │
│                                      │
│  ACTIVITY                            │
│  Tests taken: 7                      │
│  Total time on site: 184 min         │
│  Last active: 2 days ago             │
│                                      │
│  PRACTICE TEST HISTORY               │
│  ┌──────────────┬──────┬──────────┐  │
│  │ Test         │Score │ Date     │  │
│  │ Practice 1   │ 78%  │ Apr 8    │  │
│  │ Practice 2   │ 82%  │ Apr 9    │  │
│  └──────────────┴──────┴──────────┘  │
│                                      │
│  FEEDBACK SUBMITTED                  │
│  ★★★★★ "Love the platform!"          │
│  Apr 9, 2026                         │
└──────────────────────────────────────┘
```

Data loaded on demand via `GET /api/admin/data/users/:id`.

---

## 6. API Endpoints

All endpoints are **admin-only** — every handler checks `ADMIN_EMAILS.includes(session.user.email)` and returns `403` if not admin.

### 6.1 `GET /api/admin/data/feedback`

Returns paginated feedback submissions with user info joined.

**Query params:**
```
page         int       default 1
limit        int       default 50, max 200
rating       int       filter by exact rating (1–5)
hasText      bool      filter rows where review IS NOT NULL
search       string    substring search on review text
from         ISO date  filter submittedAt >= from
to           ISO date  filter submittedAt <= to
sortBy       string    'submittedAt' | 'rating' (default: 'submittedAt')
sortDir      string    'asc' | 'desc' (default: 'desc')
exportCsv    bool      if true: return all rows (ignores limit) as CSV stream
```

**Response 200 (JSON):**
```json
{
  "total": 142,
  "page": 1,
  "totalPages": 3,
  "items": [
    {
      "id": "clxxx",
      "submittedAt": "2026-04-09T15:41:00Z",
      "rating": 5,
      "review": "Love it!",
      "pageUrl": "/practice-tests",
      "userAgent": "...",
      "user": {
        "id": "clyyy",
        "name": "John Doe",
        "email": "john@gmail.com"
      }
    }
  ]
}
```

### 6.2 `DELETE /api/admin/data/feedback/:id`

Deletes a single `UserFeedback` row.

**Response 200:** `{ success: true }`  
**Response 404:** `{ error: "not_found" }`

### 6.3 `GET /api/admin/data/users`

Returns paginated user list with aggregated metrics.

**Query params:**
```
page         int       default 1
limit        int       default 50
plan         string    'free' | 'monthly' | 'yearly' | 'tester'
status       string    'active' | 'canceled' | 'trialing' | 'none'
search       string    substring match on name or email
sortBy       string    'createdAt' | 'testsCount' | 'timeSpent' | 'lastActive'
sortDir      string    'asc' | 'desc' (default: 'desc')
exportCsv    bool      if true: return all rows as CSV
```

**Response 200 (JSON):**
```json
{
  "total": 89,
  "page": 1,
  "totalPages": 2,
  "items": [
    {
      "id": "clyyy",
      "name": "John Doe",
      "email": "john@gmail.com",
      "image": "https://...",
      "createdAt": "2026-04-01T...",
      "subscriptionPlan": "monthly",
      "subscriptionStatus": "active",
      "currentPeriodEnd": "2026-05-01T...",
      "promoCodeUsed": "DUCK19",
      "isTester": false,
      "testsCount": 7,
      "totalTimeMinutes": 184,
      "lastActiveDate": "2026-04-08"
    }
  ]
}
```

**Implementation note:** `testsCount` = `COUNT(testResults)`. `totalTimeMinutes` = `SUM(UserDailyActivity.activeMinutes)`. `lastActiveDate` = `MAX(UserDailyActivity.date)`. These are computed with Prisma aggregation, not raw SQL.

### 6.4 `GET /api/admin/data/users/:id`

Returns full detail for one user (for the side panel).

**Response 200:**
```json
{
  "user": {
    "id": "clyyy",
    "name": "...",
    "email": "...",
    "image": "...",
    "createdAt": "...",
    "subscriptionPlan": "monthly",
    "subscriptionStatus": "active",
    "currentPeriodEnd": "...",
    "promoCodeUsed": "DUCK19",
    "isTester": false,
    "feedbackSubmittedAt": "..."
  },
  "metrics": {
    "testsCount": 7,
    "totalTimeMinutes": 184,
    "lastActiveDate": "2026-04-08"
  },
  "testHistory": [
    {
      "id": "...",
      "practiceTestName": "Practice Test 1",
      "score": 78,
      "completedAt": "2026-04-08T..."
    }
  ],
  "feedback": [
    {
      "id": "...",
      "rating": 5,
      "review": "Love it!",
      "submittedAt": "2026-04-09T..."
    }
  ]
}
```

### 6.5 `GET /api/admin/data/summary`

Returns all the summary card numbers in a single fast call.

**Response 200:**
```json
{
  "feedback": {
    "total": 142,
    "averageRating": 4.2,
    "thisWeek": 18,
    "withText": 97
  },
  "users": {
    "total": 89,
    "paid": 24,
    "free": 62,
    "newThisWeek": 6
  }
}
```

---

## 7. CSV Export Format

### Feedback CSV columns:
```
id, submittedAt, rating, review, pageUrl, userName, userEmail
```

### Users CSV columns:
```
id, name, email, joined, plan, status, testsCount, totalTimeMinutes, lastActiveDate, promoCodeUsed, isTester
```

Export is triggered by the `[ Export CSV ]` button. The API returns the file with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="feedback-2026-04-10.csv"`. No separate download page needed.

---

## 8. Files to Create / Modify

> ⚠️ DO NOT create or modify any of these until explicitly instructed.

### New files:
```
src/app/admin/data/page.tsx                        ← main page, two tabs
src/app/api/admin/data/feedback/route.ts           ← GET all feedback + CSV export
src/app/api/admin/data/feedback/[id]/route.ts      ← DELETE single feedback
src/app/api/admin/data/users/route.ts              ← GET paginated user list
src/app/api/admin/data/users/[id]/route.ts         ← GET single user detail
src/app/api/admin/data/summary/route.ts            ← GET summary card numbers
```

### Modified files:
```
src/app/admin/page.tsx                             ← add "Data Dashboard" card linking to /admin/data
```

---

## 9. Component Architecture

```
src/app/admin/data/page.tsx
├── AdminDataHeader         ← title + tab switcher
├── SummaryCards            ← 4 stat cards (fetches /api/admin/data/summary)
├── FeedbackTab             ← shown when tab = 'feedback'
│   ├── FilterBar           ← rating, text, date, search, refresh, export
│   ├── FeedbackTable       ← paginated table with sort/delete
│   └── DeleteConfirmDialog ← inline confirmation
└── UsersTab                ← shown when tab = 'users'
    ├── FilterBar           ← plan, status, sort, search, refresh, export
    ├── UsersTable          ← paginated table with sort
    └── UserDetailPanel     ← slide-in panel (fetches /api/admin/data/users/:id)
```

All state (filters, sort, page, selected user) lives in the page component via `useState`. No external state management library needed.

---

## 10. Edge Cases

| Scenario | Behavior |
|---|---|
| Non-admin visits `/admin/data` | Page returns `null` (same pattern as `/admin/reviews`) while API returns 403 |
| User with no `UserDailyActivity` rows | `totalTimeMinutes = 0`, `lastActiveDate = null` → show `—` in table |
| User with no `TestResult` rows | `testsCount = 0` |
| Feedback from anonymous user (`userId = null`) | Display `Anonymous` in the User column with a gray badge |
| `review` text is null | Show `—` in the review column; "Rating only" badge |
| Deleting a feedback row that was already deleted | API returns 404 → show brief toast `"Review not found"` |
| Very long review text | Truncated to 120 chars with `Show more` toggle (no new page) |
| Export with 0 rows | Returns a CSV with only the header row |
| `UserDailyActivity` table missing or empty | Gracefully handle with empty aggregate (not a crash) |
| Admin visits page while unauthenticated (session expired) | Auth check returns 403 → page shows "Access denied" message and link back to sign in |
