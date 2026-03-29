# DuckSAT — Practice Exercises & Search Expansion
## Product Requirements Document

**Version:** 1.0  
**Date:** March 11, 2026  
**Status:** DRAFT — Awaiting Approval

---

## 1. Problem Statement

DuckSAT currently offers full-length 98-question practice tests (~2h 14min) as the only practice mode. This is a significant commitment that discourages frequent sessions. Students need:

- **Quick, targeted practice** — drill specific topics without taking a full test
- **Discoverability** — search and browse the 3,900+ question bank by topic, difficulty, and type
- **Varied exercise formats** — not just full tests; bite-sized drills, topic quizzes, daily challenges
- **Personalized recommendations** — leverage onboarding data (weak categories, target score) to suggest what to study

### What Exists Today
| Feature | Status |
|---------|--------|
| Full practice tests (98q, 4 modules) | ✅ Live |
| Fixed practice tests (Epic #61) | ✅ Live |
| Random practice mode | ✅ Live (but also 98q) |
| Question search/browse for students | ❌ Missing |
| Topic-specific drills | ❌ Missing |
| Quick quiz mode | ❌ Missing |
| Daily practice / streaks | ❌ Missing |
| Personalized recommendations | ❌ Missing |
| Flashcard / review mode | ❌ Missing |

---

## 2. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Increase daily practice sessions | Sessions per user per week | 3x current |
| Reduce barrier to practice | Avg session duration (new modes) | < 15 minutes |
| Improve weak areas faster | Category score improvement rate | 20% faster |
| Question bank utilization | % of questions seen per user | > 40% in 30 days |

---

## 3. Feature Specifications

### 3.1 — Question Bank Search Page (`/questions`)

**Route:** `/questions`  
**Auth:** Required  

A searchable, filterable browse page for the entire question bank.

**Filters (sidebar/top bar):**
| Filter | Type | Values |
|--------|------|--------|
| Section | Toggle | Reading & Writing · Math |
| Category | Multi-select chips | algebra, geometry, reading-comprehension, grammar, vocabulary, writing-skills, advanced-math, statistics |
| Difficulty | Multi-select chips | Easy · Medium · Hard |
| Has Diagram | Toggle | Yes/No |
| Search text | Text input | Full-text search on question text |

**Question Cards display:**
- Truncated question text (first 120 chars)
- Category + difficulty badges
- Diagram indicator icon
- "Practice" button → opens question in single-question practice mode

**Question Detail (expand or modal):**
- Full question text with MathRenderer
- Passage (if applicable)
- Chart/diagram (if applicable)
- Answer options (hidden until user attempts)
- After answering: correct/incorrect feedback, explanation, wrong-answer explanations

**Pagination:** Infinite scroll or page-based, 20 questions per page

**API:** Uses existing `GET /api/questions` with `search`, `moduleType`, `category`, `difficulty` params. No new API needed.

---

### 3.2 — Topic Practice / Quick Drill Mode (`/practice/[category]`)

**Route:** `/practice` (topic selection) → `/practice/[category]` (drill)  
**Auth:** Required  

Short, focused practice sessions on a specific topic.

**Topic Selection Page (`/practice`):**
- Grid of all 8 SAT categories in two sections:
  - **Reading & Writing:** Reading Comprehension, Grammar & Usage, Vocabulary, Writing & Rhetoric
  - **Math:** Algebra, Advanced Math, Geometry & Trig, Problem Solving & Data
- Each card shows:
  - Category name + icon
  - User's current accuracy % (from CategoryPerformance table)
  - Question count available
  - Color-coded proficiency indicator (red/yellow/green)
  - "Start Drill" button

**Drill Page (`/practice/[category]`):**
- **Format:** 10 questions, untimed (no time pressure)
- **Selection:** Random questions from the selected category, mixed difficulty
- **UX Flow:**
  1. Show question + options
  2. User selects answer
  3. Immediately show correct/incorrect + explanation (no waiting until the end)
  4. "Next Question" button
  5. After 10 questions → results summary card
- **Results Card:**
  - Score: X/10
  - Per-question breakdown (correct/incorrect with category + difficulty)
  - "Try Again" (same category) or "Back to Topics" buttons
  - Save results to progress tracking

**Difficulty selector (optional):** Before starting, user can pick Easy / Medium / Hard / Mixed (default Mixed)

**API:** Uses existing `GET /api/questions/practice?moduleType=...&category=...&count=10`

---

### 3.3 — Daily Challenge (`/daily`)

**Route:** `/daily`  
**Auth:** Required  

A curated set of 5 questions per day that all users see (same questions).

**Behavior:**
- 5 questions selected daily at midnight UTC, seeded by date (deterministic)
- Mix: 2 Reading/Writing + 3 Math (or 3/2, alternating days)
- Difficulty: 1 easy, 3 medium, 1 hard
- **Same questions for all users** on a given day (social/competitive element)
- After completion: show score, show percentile vs other users who completed that day

**Daily Streak Tracking:**
- Track consecutive days completed
- Show streak counter on home page and daily challenge page
- Stored in existing `UserAnalytics.streakDays` field

**API:** New endpoint `GET /api/daily-challenge` that returns 5 date-seeded questions  
**DB:** New model `DailyChallenge` to store daily question sets + user completions

---

### 3.4 — Missed Questions Review (`/review/missed`)

**Route:** `/review/missed`  
**Auth:** Required  

A dedicated page to re-practice questions the user previously got wrong.

**Behavior:**
- Queries `QuestionResult` table for `isCorrect = false` for current user
- Groups by category, shows count of missed per category
- User can filter by category or review all
- **Flashcard mode:** Show question → user thinks → reveal answer + explanation
- Tracks re-attempts: if user gets it right on review, mark as "learned"

**API:** New endpoint `GET /api/review/missed?category=...&limit=20`

---

### 3.5 — Personalized Recommendations (Home Page Widget)

**Location:** Home page (authenticated state), `/practice` page top  
**Auth:** Required  

Uses onboarding `weakCategories` + actual `CategoryPerformance` data to suggest next actions.

**Recommendation Cards (up to 3):**
1. **Weakest category drill** — "You're scoring 42% on Geometry. Practice 10 questions?" → links to `/practice/geometry`
2. **Daily challenge** — "Today's 5 questions are ready!" → `/daily`
3. **Missed questions** — "You have 23 missed questions to review" → `/review/missed`

**Logic:**
- Weakest category = lowest accuracy from `CategoryPerformance` with ≥10 questions attempted
- Falls back to onboarding `weakCategories` if no test data yet

**API:** New endpoint `GET /api/recommendations`

---

### 3.6 — Home Page Updates

Update the authenticated home page to showcase all practice modes:

**Current layout (keep):**
- Complete Practice Tests section
- Random Practice Mode section

**Add below existing sections:**

**Quick Practice section:**
- "Topic Drills" card → `/practice`
- "Daily Challenge" card → `/daily` (with streak badge)
- "Review Missed Questions" card → `/review/missed`

**Personalized Recommendations widget** (Section 3.5)

---

## 4. Data Model Changes

### New Model: `DailyChallengeCompletion`
```prisma
model DailyChallengeCompletion {
  id          String   @id @default(cuid())
  userId      String
  challengeDate DateTime // Date only (no time)
  score       Int      // Number correct (0-5)
  totalQuestions Int    // Always 5
  completedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, challengeDate])
  @@map("daily_challenge_completions")
}
```

### User Model Addition
```prisma
// Add to User relations:
dailyChallengeCompletions DailyChallengeCompletion[]
currentStreak             Int      @default(0)
longestStreak             Int      @default(0)
lastPracticeDate          DateTime?
```

---

## 5. New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/daily-challenge` | GET | Get today's 5 seeded questions |
| `POST /api/daily-challenge` | POST | Submit daily challenge results |
| `GET /api/review/missed` | GET | Get user's previously missed questions |
| `GET /api/recommendations` | GET | Get 3 personalized recommendation cards |
| `GET /api/practice/[category]/results` | POST | Save topic drill results |

---

## 6. New Pages

| Route | Page | Priority |
|-------|------|----------|
| `/questions` | Question Bank Search | P0 |
| `/practice` | Topic Selection Grid | P0 |
| `/practice/[category]` | Quick Drill (10 questions) | P0 |
| `/daily` | Daily Challenge | P1 |
| `/review/missed` | Missed Questions Review | P1 |

---

## 7. Implementation Priority

### Phase 1 — Core Practice (P0)
1. **Question Bank Search Page** (`/questions`)
2. **Topic Practice Selection** (`/practice`)
3. **Quick Drill Mode** (`/practice/[category]`)
4. **Home Page Updates** (add quick practice section)

### Phase 2 — Engagement (P1)
5. **Daily Challenge** (`/daily`)
6. **Missed Questions Review** (`/review/missed`)
7. **Personalized Recommendations** (home page widget + `/practice` page)
8. **Streak tracking** (DB + UI)

---

## 8. Design Principles

- **Match existing DuckSAT aesthetic:** Gradient backgrounds (`from-blue-50 via-indigo-50 to-purple-50`), white cards with `backdrop-blur-xl rounded-3xl shadow-xl`, purple/blue gradient text and buttons
- **Reuse existing components:** `MathRenderer`, `ChartRenderer`, `Button`, `Badge` — no new UI libraries
- **Mobile responsive:** All pages must work on phone screens
- **Instant feedback:** Drill mode shows correct/incorrect immediately per question (not after all 10)
- **No new auth requirements:** All pages use existing NextAuth session check

---

## 9. Non-Goals (Out of Scope)

- Multiplayer/competitive features (beyond daily challenge percentile)
- Timed drill mode (drills are untimed for low-pressure practice)
- New question generation (uses existing 3,900+ question bank)
- Gamification beyond streaks (no XP, levels, badges)
- Spaced repetition algorithm (simple missed-question review instead)

---

## 10. Open Questions

1. **Daily challenge seed:** Should we pre-generate daily questions in cron or compute deterministically from date hash at request time? (Recommendation: date-hash for simplicity)
2. **Drill length:** 10 questions per drill — should this be configurable (5/10/20)?
3. **Drill results persistence:** Save to `TestResult` table (reuse) or new lightweight table?
4. **Question detail page:** Should `/questions/[id]` be its own standalone page or always a modal/expand on the search page?
