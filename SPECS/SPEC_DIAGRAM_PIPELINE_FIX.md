# SPEC: Diagram Pipeline Fix

## Problem
Questions with images/diagrams always show "Diagram Unavailable" placeholder in practice tests.

## Root Cause Analysis — 3 Break Points

### Break 1: practice-test/page.tsx — Render condition ignores `imageData`
```tsx
// CURRENT (broken): only checks chartData and imageUrl
{(currentQuestion.chartData || currentQuestion.imageUrl) && (
  <ChartRenderer
    chartData={currentQuestion.chartData}
    imageUrl={currentQuestion.imageUrl}
    imageAlt={currentQuestion.imageAlt || 'Question diagram'}
  />
)}
```
- **Missing**: `imageData` is not in the condition, so questions with only `imageData` (no chartData/imageUrl) render nothing.  
- **Missing**: Even if the condition passed, `imageData` and `imageMimeType` are never passed as props to `ChartRenderer`, despite it accepting them.

### Break 2: Practice Test API — Does not select `imageUrl`
`src/app/api/practice-tests/[id]/route.ts` select clause includes `imageData`, `imageMimeType`, `imageAlt`, `chartData` — but NOT `imageUrl`.

Questions that only have `imageUrl` (no `imageData`) will have `imageUrl: undefined` on the client.

### Break 3: Questions API — Drops `imageData` in normalization
`src/app/api/questions/route.ts`:
1. Fetches `imageData` from DB and converts Buffer → base64 string (line 240)
2. In the normalization step (line 425+), the result object includes `imageUrl`, `imageAlt`, `chartData` but **drops `imageData` and `imageMimeType`**.

Random-test questions arrive at the client with no `imageData`.

## Pipeline (Current vs Fixed)

```
Database (imageData, imageMimeType, imageUrl, imageAlt, chartData)
    │
    ├─ Fixed practice tests: /api/practice-tests/[id]
    │   ├─ SELECT: imageData ✓, imageMimeType ✓, imageAlt ✓, chartData ✓, imageUrl ✗ ← FIX
    │   ├─ Convert: imageData → data:URI ✓
    │   └─ Response: imageData as data:URI, imageUrl missing ← FIX
    │
    ├─ Random tests: /api/questions
    │   ├─ SELECT: all fields ✓
    │   ├─ Convert: imageData → base64 ✓
    │   └─ Normalization: DROPS imageData + imageMimeType ← FIX
    │
    └─ Client: practice-test/page.tsx
        ├─ Condition: chartData || imageUrl (ignores imageData) ← FIX
        └─ Props: does not pass imageData/imageMimeType to ChartRenderer ← FIX
```

## Fix Plan

### File 1: `src/app/practice-test/page.tsx`
- Add `imageData` to the render condition
- Pass `imageData` and `imageMimeType` props to `ChartRenderer`

### File 2: `src/app/api/practice-tests/[id]/route.ts`
- Add `imageUrl: true` to the Prisma select clause
- Include `imageUrl` and `imageMimeType` in the mapped question output

### File 3: `src/app/api/questions/route.ts`
- Add `imageData` and `imageMimeType` to the normalization result object

### File 4: `src/components/ChartRenderer.tsx`
- Handle `imageData` that's already a data URI (starts with `data:`) vs raw base64
- Fix placeholder fallback logic: only show placeholder when there's NO chartData with a renderable type (bar, scatter, geometry). Previously, chartData with type "bar" fell to the else branch → placeholder → early return, never reaching DynamicChart.

## Verification
After fix, questions with any image source (imageData blob, imageUrl, chartData) should render correctly in both fixed and random practice tests.
