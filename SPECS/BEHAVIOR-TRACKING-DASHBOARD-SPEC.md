# Behavior Tracking Dashboard — Spec

**Date:** 2026-04-10  
**Status:** Approved for implementation

---

## 1. Goal

Extend the admin data dashboard at `/admin/data` with **three new tabs**:
- **Pages** — time spent per page (from existing `PageView` table)
- **Learning** — drills per topic, questions answered/correct per topic (from existing `DrillAttempt` + `DrillQuestionResult`)
- **Activity** — button clicks ranked by frequency + click/mouse-movement heatmap (new `ClickEvent` table)

---

## 2. What Already Exists (leverage, don't rebuild)

| Data | Table | Tracked by |
|---|---|---|
| Page dwell time | `PageView` | `usePageTracking()` in `AnalyticsProvider` |
| Drills per topic | `DrillAttempt` | `trackDrill()` on drill complete |
| Per-question results | `DrillQuestionResult` | same |
| Button/nav clicks | `UserEvent` | `trackEvent()` in various pages |
| Daily activity totals | `UserDailyActivity` | drill + pageview routes |

---

## 3. New Data: Click & Mouse Tracking

### 3.1 New Prisma Model — `ClickEvent`
```prisma
model ClickEvent {
  id        String   @id @default(cuid())
  userId    String?
  sessionId String?
  pagePath  String
  xPct      Float    // x as % of viewport width (0-100)
  yPct      Float    // y as % of viewport height (0-100)
  element   String?  // simplified tag: 'button', 'a', 'input' etc.
  label     String?  // button text / aria-label (max 80 chars)
  eventType String   @default("click")  // 'click' | 'move'
  createdAt DateTime @default(now())

  @@index([pagePath, createdAt])
  @@index([userId])
  @@map("click_events")
}
```

### 3.2 Client Tracking — `usePointerTracking()` hook (in `src/lib/tracking.ts`)

**Click tracking:**
- Global `document.addEventListener('click', ...)` 
- Only captures clicks on `<button>`, `<a>`, `[role="button"]`, `<select>`, `<input[type=submit]>`
- Records: `xPct`, `yPct`, `element` tag, `label` (textContent trimmed to 80 chars or aria-label)
- Batched and sent via `POST /api/tracking/clicks` (same beacon pattern as events)

**Mouse movement tracking:**
- Tracks `mousemove` events, samples position at most once every 5 seconds
- Only records if position has moved at least 5% in any direction since last sample
- Records `eventType: 'move'`, position only (no element/label)
- Capped at 12 move samples per minute per page

**Touch support:**
- Same logic for `touchstart` events on mobile

### 3.3 New Tracking API — `POST /api/tracking/clicks`
```
Body: {
  sessionId: string
  events: [{
    pagePath: string,
    xPct: number,
    yPct: number,
    element?: string,
    label?: string,
    eventType: 'click' | 'move'
  }]
}
```
- Auth: optional (userId from session if present)
- Batch limit: 100 events per request
- Validates: `xPct` and `yPct` must be 0–100, `pagePath` must start with `/`

---

## 4. New Admin API Endpoints

### `GET /api/admin/data/page-analytics`
Query params: `from`, `to`, `limit` (default 30)  
Returns: pages sorted by total visits, with avg/sum dwell and unique user count  
Source: `PageView` table, SQL GROUP BY pagePath

### `GET /api/admin/data/events`
Query params: `from`, `to`, `eventType`, `limit` (default 50)  
Returns: events grouped by `eventName`, sorted by count desc  
Source: `UserEvent` table

### `GET /api/admin/data/learning`
Query params: `from`, `to`  
Returns: per-category drill stats (drills started, drills completed, total questions, correct answers, avg score)  
Source: `DrillAttempt` + `DrillQuestionResult` grouped by `category`

### `GET /api/admin/data/heatmap`
Query params: `page` (required, e.g. `/practice`), `type` (`click`|`move`|`all`), `from`, `to`  
Returns: `{ points: [{xPct, yPct, eventType}], total }` (capped at 2000 points)  
Source: `ClickEvent` table

---

## 5. Admin UI Changes

### Tabs added to `/admin/data/page.tsx`
From 2 tabs (Feedback, Users) → 5 tabs:
1. 💬 Feedback *(existing)*
2. 👥 Users *(existing)*
3. 📄 Pages *(new)*
4. 📚 Learning *(new)*
5. 🖱️ Activity *(new)*

### Pages Tab
- Date range picker (last 7 / 30 / 90 days)
- Table: Page | Visits | Avg Dwell | Total Time | Unique Users
- Sorted by Total Time desc by default

### Learning Tab
- Date range picker
- Table: Topic | Drills Done | Questions | Correct | Accuracy | Avg Score | Avg Time/Q
- Color-coded accuracy cells (red <60%, yellow 60–80%, green >80%)

### Activity Tab — two sections
**Section 1: Button Clicks**
- Top 30 events by count in selected date range
- Table: Event Name | Type | Count | Example Page

**Section 2: Heatmap**
- Page selector (dropdown of all pages that have click data)
- Toggle: clicks only / moves only / both
- Simple dot visualization: grey viewport rectangle, colored dots (blue=click, orange=move)
- Each dot is semi-transparent; many overlapping dots = darker area

---

## 6. Files Created / Modified

| Action | File |
|---|---|
| ADD | `prisma/schema.prisma` — `ClickEvent` model |
| ADD | `src/app/api/tracking/clicks/route.ts` |
| ADD | `src/app/api/admin/data/page-analytics/route.ts` |
| ADD | `src/app/api/admin/data/events/route.ts` |
| ADD | `src/app/api/admin/data/learning/route.ts` |
| ADD | `src/app/api/admin/data/heatmap/route.ts` |
| MODIFY | `src/lib/tracking.ts` — add `usePointerTracking()` |
| MODIFY | `src/components/AnalyticsProvider.tsx` — call the new hook |
| MODIFY | `src/app/admin/data/page.tsx` — add 3 new tabs |

---

## 7. Safety / Error Principles
- All new tracking is fire-and-forget; tracking errors never surface to users
- All admin endpoints return 403 for non-admins (same pattern as existing routes)
- `ClickEvent` inserts use `createMany` (no transaction needed)
- Schema change uses `prisma db push` (no migrations folder in this project)
- New Prisma client generated before build
- All new TS files must have zero type errors before push
