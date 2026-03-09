# SPEC: Test Lockdown Experience & SAT 400–1600 Scoring

**PRD Reference:** `prd/PRD_TEST_LOCKDOWN_AND_SAT_SCORING.md`  
**Date:** 2026-03-08  
**Status:** Draft  

---

## 1. Overview

This spec describes the exact code changes needed to implement the three features defined in the PRD:

1. **Confirmation Gate** – modal before test begins.
2. **Test Lockdown** – prevent casual exit; add abandon flow.
3. **SAT 400–1600 Scoring** – raw-to-scaled conversion + UI.

---

## 2. File Inventory

| File | Action | Purpose |
|------|--------|---------|
| `src/components/test/TestLauncher.tsx` | **Modify** | Add confirmation modal as a second step after "Start" button click |
| `src/app/practice-test/page.tsx` | **Modify** | Remove "← Back to Home" button; add `beforeunload` listener; add Abandon Test button & dialog; add `abandonTest` handler |
| `src/hooks/useTestState.ts` | **Modify** | Add `abandonTest()` callback; update `completeTest()` to compute SAT scores; expose `abandonTest` in return value |
| `src/lib/satScoring.ts` | **Create** | Pure function: `computeSATScores(ebrwRaw, ebrwTotal, mathRaw, mathTotal) → { ebrw, math, composite }` |
| `src/types/test.ts` | **Modify** | Add `satScore`, `ebrwScore`, `mathScore` to `TestResult` |
| `src/components/test/TestAnalytics.tsx` | **Modify** | Display 400–1600 composite prominently with section scores; demote percentage |
| `src/components/test/AbandonTestDialog.tsx` | **Create** | Reusable destructive-confirmation dialog component |

---

## 3. Detailed Changes

### 3.1 `src/lib/satScoring.ts` (New)

```typescript
interface SATScores {
  ebrw: number   // 200–800
  math: number   // 200–800
  composite: number // 400–1600
}

// Piecewise-linear interpolation tables
const EBRW_TABLE: [number, number][] = [
  [0, 200], [10, 320], [20, 430], [30, 520],
  [40, 620], [48, 720], [54, 800]
]

const MATH_TABLE: [number, number][] = [
  [0, 200], [8, 320], [16, 430], [24, 540],
  [32, 640], [38, 720], [44, 800]
]

function interpolate(raw: number, table: [number, number][]): number {
  if (raw <= table[0][0]) return table[0][1]
  if (raw >= table[table.length - 1][0]) return table[table.length - 1][1]
  
  for (let i = 0; i < table.length - 1; i++) {
    const [r1, s1] = table[i]
    const [r2, s2] = table[i + 1]
    if (raw >= r1 && raw <= r2) {
      const t = (raw - r1) / (r2 - r1)
      return Math.round(s1 + t * (s2 - s1))
    }
  }
  return table[table.length - 1][1]
}

// Scale raw to max before lookup (handles non-standard question counts)
export function computeSATScores(
  ebrwRaw: number, ebrwTotal: number,
  mathRaw: number, mathTotal: number
): SATScores {
  const EBRW_MAX = 54
  const MATH_MAX = 44
  
  const scaledEbrwRaw = ebrwTotal > 0 ? Math.round((ebrwRaw / ebrwTotal) * EBRW_MAX) : 0
  const scaledMathRaw = mathTotal > 0 ? Math.round((mathRaw / mathTotal) * MATH_MAX) : 0
  
  const ebrw = interpolate(scaledEbrwRaw, EBRW_TABLE)
  const math = interpolate(scaledMathRaw, MATH_TABLE)
  
  return { ebrw, math, composite: ebrw + math }
}
```

### 3.2 `src/types/test.ts` – TestResult Changes

Add three optional fields to `TestResult`:

```diff
  score: number // percentage (kept for backward compat)
+ satScore?: number    // 400–1600 composite
+ ebrwScore?: number   // 200–800
+ mathScore?: number   // 200–800
```

### 3.3 `src/hooks/useTestState.ts` – Changes

#### a. Import `computeSATScores`
```typescript
import { computeSATScores } from '@/lib/satScoring'
```

#### b. In `completeTest()` callback – compute and store SAT scores

After calculating `correctAnswers` and before setting `finalResults`:

```typescript
// Separate raw counts by section
const readingModules = finalModuleResults.slice(0, 2) // modules 0,1
const mathModules = finalModuleResults.slice(2, 4)     // modules 2,3

const ebrwRaw = readingModules.flat().filter(r => r.isCorrect).length
const ebrwTotal = readingModules.flat().length
const mathRaw = mathModules.flat().filter(r => r.isCorrect).length
const mathTotal = mathModules.flat().length

const satScores = computeSATScores(ebrwRaw, ebrwTotal, mathRaw, mathTotal)
```

Then include in `finalResults`:
```typescript
satScore: satScores.composite,
ebrwScore: satScores.ebrw,
mathScore: satScores.math,
```

#### c. Add `abandonTest` callback

```typescript
const abandonTest = useCallback(() => {
  // Reset all state to initial
  setHasStarted(false)
  setModuleStarted(false)
  setCurrentModuleIndex(0)
  setCurrentQuestionIndex(0)
  setIsTransitioning(false)
  setIsComplete(false)
  setIsBreakTime(false)
  setBreakTimeRemaining(0)
  setShowReview(false)
  setTimeRemaining(0)
  setSelectedAnswers([])
  setModuleStartTime(null)
  setTestStartTime(null)
  setTestResults(null)
  setModuleResults([])
  setCurrentModuleQuestions([])
  setUsedQuestionIds([])
  setAllPracticeTestModules([])
  setQuestionStartTimes({})
  setQuestionTimeSpent({})
  setError(null)
}, [])
```

Expose `abandonTest` in the return object.

### 3.4 `src/components/test/TestLauncher.tsx` – Confirmation Step

Replace the single "Start" button with a two-phase flow:

1. First click: shows the confirmation overlay within the same component.
2. Overlay has "I'm Ready – Begin Test" and "Cancel" buttons.
3. "I'm Ready" calls `onStartTest()`.
4. "Cancel" hides the overlay.

State: `const [showConfirmation, setShowConfirmation] = useState(false)`

Confirmation overlay content:
- "⚠️ You are about to begin a timed SAT practice test."
- Bullet list: 4 modules, 98 questions, ~2 h 14 min; each module is timed; you cannot pause; leaving early will delete all progress.
- Primary: "I'm Ready – Begin Test" (gradient button)
- Secondary: "Cancel" (gray button)

### 3.5 `src/components/test/AbandonTestDialog.tsx` (New)

A modal overlay component:

```typescript
interface AbandonTestDialogProps {
  isOpen: boolean
  onConfirmAbandon: () => void
  onCancel: () => void
}
```

Content:
- "⚠️ Abandon Test?"
- "All your progress on this test will be permanently deleted. This cannot be undone."
- Destructive button: "Yes, Abandon Test" (red)
- Default button: "Continue Test" (blue, auto-focused)

### 3.6 `src/app/practice-test/page.tsx` – Lockdown Changes

#### a. Remove "← Back to Home" button
Delete the entire `<button onClick={() => router.push('/')}>← Back to Home</button>` block.

#### b. Add `beforeunload` listener
```typescript
useEffect(() => {
  if (!hasStarted || isComplete) return
  
  const handler = (e: BeforeUnloadEvent) => {
    e.preventDefault()
    e.returnValue = ''
  }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [hasStarted, isComplete])
```

#### c. Add Abandon Test UI
- Import `AbandonTestDialog`.
- Add state: `const [showAbandonDialog, setShowAbandonDialog] = useState(false)`.
- In the header area, replace the removed "Back" button with:
  ```tsx
  <button
    onClick={() => setShowAbandonDialog(true)}
    className="text-red-400 hover:text-red-600 text-sm font-medium underline"
  >
    ⚠️ Abandon Test
  </button>
  ```
- Render `<AbandonTestDialog>` conditionally.
- On confirm: call `abandonTest()`, then `router.push('/practice-tests')`.

### 3.7 `src/components/test/TestAnalytics.tsx` – Scoring UI

Replace the hero score section:

**Before:**
```tsx
<div className="text-6xl font-bold text-blue-600 mb-2">{percentage}%</div>
```

**After:**
```tsx
<div className="text-7xl font-black text-blue-700 mb-1">
  {testResults.satScore ?? '—'}
</div>
<div className="text-2xl font-semibold text-gray-500 mb-1">
  out of 1600
</div>
<div className="flex justify-center gap-8 mt-4">
  <div className="text-center">
    <div className="text-3xl font-bold text-indigo-600">{testResults.ebrwScore ?? '—'}</div>
    <div className="text-sm text-gray-500">Reading & Writing</div>
  </div>
  <div className="text-center">
    <div className="text-3xl font-bold text-emerald-600">{testResults.mathScore ?? '—'}</div>
    <div className="text-sm text-gray-500">Math</div>
  </div>
</div>
<div className="text-sm text-gray-400 mt-4">
  {totalCorrect}/{totalQuestions} correct ({percentage}%)
</div>
```

---

## 4. Test Plan

| Test Case | Expected Result |
|-----------|----------------|
| Click "Start Practice Test" | Confirmation overlay appears; test does NOT begin |
| Click "Cancel" on confirmation | Overlay dismissed; user stays on launcher |
| Click "I'm Ready – Begin Test" | Test begins; modules load |
| During test, try browser back/refresh | `beforeunload` warning fires |
| During test, look for "Back to Home" | Button does NOT exist |
| Click "⚠️ Abandon Test" | Destructive dialog appears |
| Click "Continue Test" in abandon dialog | Dialog closes; test resumes |
| Click "Yes, Abandon" | All progress cleared; redirect to `/practice-tests` |
| Complete full test | Results show SAT composite 400–1600, section scores, and percentage |
| Score 0 raw on both sections | Composite = 400 (200 + 200) |
| Score perfect on both sections | Composite = 1600 (800 + 800) |
| Score 30/54 EBRW, 24/44 Math | EBRW ≈ 520, Math ≈ 540, Composite ≈ 1060 |

---

## 5. Rollout

1. Implement all changes.
2. Local dev verification.
3. Build production.
4. Deploy to Azure App Service.
5. Smoke-test on `https://www.ducksat.com`.
