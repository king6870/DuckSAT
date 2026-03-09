# PRD: Test Lockdown Experience & SAT 400–1600 Scoring

**Author:** DuckSAT Engineering  
**Date:** 2026-03-08  
**Status:** Draft  
**Epic:** Test-Taking Seriousness & Authentic Scoring  

---

## 1. Problem Statement

The current test-taking flow is too casual:

| Issue | Current Behavior | Desired Behavior |
|-------|-----------------|------------------|
| **No confirmation** | Clicking "Start Practice Test" immediately begins the test | User must explicitly confirm they are ready and understand the commitment |
| **Easy exit** | A "← Back to Home" button is always visible during the test; user can navigate away freely | Once locked in, navigation controls are hidden; leaving requires an explicit "Abandon Test" action that warns progress will be deleted |
| **Percentage scoring** | Score is displayed as a simple percentage (e.g., "78%") | Score is reported on the official SAT scale of **400–1600** (200–800 per section) |

These gaps reduce the psychological weight of the practice test, making it less effective as realistic SAT preparation.

---

## 2. Goals

1. **Confirmation Gate** – Before the test begins, present a clear confirmation dialog that outlines consequences (timed, no easy escape, progress lost on abandon).
2. **Test Lockdown** – Remove casual navigation once the test is in progress. The only way out is to complete the test or explicitly abandon it, which deletes all in-progress answers.
3. **SAT-Scale Scoring (400–1600)** – Replace the percentage score with an authentic-feeling SAT composite score plus section scores, shown on the results/analytics screen.

---

## 3. User Stories

### US-1: Confirmation Before Starting
> As a student, I want the app to ask me "Are you sure you want to start?" so I commit mentally to the full test session.

**Acceptance Criteria:**
- After clicking "Start Practice Test", a modal/overlay appears with:
  - Summary of test structure (4 modules, ~2 h 14 min, 98 questions).
  - Bullet warnings: timed modules, no pausing, progress deleted on abandon.
  - Two buttons: **"I'm Ready – Begin Test"** (primary) and **"Cancel"** (secondary).
- Test does not begin until user clicks the primary button.

### US-2: Test Lockdown
> As a student taking a practice test, I should feel locked into the experience just like the real SAT, unable to casually browse away.

**Acceptance Criteria:**
- During an active test (any module in progress):
  - The "← Back to Home" button is **removed**.
  - Browser back-button / navigation triggers a `beforeunload` warning ("You have an active test in progress. Leaving will abandon your test.").
  - A small **"⚠️ Abandon Test"** link (bottom of sidebar or footer) exists for genuine exits.
- Clicking "Abandon Test" opens a confirmation dialog:
  - Text: "Are you sure? All progress for this test will be permanently deleted."
  - Buttons: **"Yes, Abandon"** (destructive) and **"Continue Test"** (default focus).
- On confirmation, all in-progress state is cleared and user is redirected to `/practice-tests`.

### US-3: SAT 400–1600 Scoring
> As a student, I want my score on a 400–1600 scale so I can compare it to real SAT benchmarks.

**Acceptance Criteria:**
- Composite score displayed as **400–1600** (sum of two section scores).
- **Evidence-Based Reading & Writing (EBRW) Section Score:** 200–800, derived from Modules 1 & 2 raw reading-writing performance.
- **Math Section Score:** 200–800, derived from Modules 3 & 4 raw math performance.
- Scoring algorithm maps raw correct counts → scaled scores using a piecewise-linear curve that approximates real College Board conversion tables.
- The percentage remains visible but secondary (small text below the scaled score).
- Results page (`TestAnalytics`) displays: composite score prominently, section scores below, module breakdowns beneath that.

---

## 4. Scoring Model

### 4.1 Digital SAT Structure (Reference)

| Section | Modules | Questions | Raw Score Range |
|---------|---------|-----------|-----------------|
| EBRW | 1 & 2 | 27 + 27 = 54 | 0–54 |
| Math | 3 & 4 | 22 + 22 = 44 | 0–44 |
| **Total** | | **98** | 0–98 |

### 4.2 Raw → Scaled Conversion

Each section uses a **piecewise-linear interpolation** between anchor points derived from published SAT score conversion tables:

**EBRW (54 raw → 200–800):**
| Raw | Scaled |
|-----|--------|
| 0 | 200 |
| 10 | 320 |
| 20 | 430 |
| 30 | 520 |
| 40 | 620 |
| 48 | 720 |
| 54 | 800 |

**Math (44 raw → 200–800):**
| Raw | Scaled |
|-----|--------|
| 0 | 200 |
| 8 | 320 |
| 16 | 430 |
| 24 | 540 |
| 32 | 640 |
| 38 | 720 |
| 44 | 800 |

### 4.3 Composite
`compositeScore = ebrwScaled + mathScaled` → range 400–1600.

---

## 5. Scope

### In-Scope
- Confirmation modal on test start.
- `beforeunload` browser warning during active test.
- Remove "Back to Home" during active test; add "Abandon Test" with destructive confirmation.
- SAT-scale scoring function.
- Updated `TestAnalytics` results UI.
- Updated `TestResult` type to include `satScore`, `ebrwScore`, `mathScore`.

### Out-of-Scope
- Adaptive difficulty between Module 1→2 / Module 3→4 (future epic).
- Persisting abandoned-test records.
- Printing/exporting score reports.

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `beforeunload` not supported on all mobile browsers | Treat as progressive enhancement; lockdown still removes nav buttons |
| Users confused by can't-go-back | Confirmation dialog clearly states the commitment; Abandon Test is always available |
| Scoring curve may not match actual College Board results | Clearly label as "estimated SAT score"; include disclaimer |

---

## 7. Success Metrics

- **Completion rate:** ≥80% of started tests are completed (vs. current baseline where casual exits are unmeasured).
- **User feedback:** Students report the experience feels more "real."
- **Score comprehension:** Students can articulate their score on the 400–1600 scale.
