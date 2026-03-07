# Technical Specification: Admin Questions Page — ID Display, Diagram URL, and Auto-Generated Cleanup

**Document Type:** Technical Specification  
**Feature ID:** ADMIN-QA-001  
**PRD Reference:** `prd/PRD-ADMIN-QUESTIONS-DISPLAY-CLEANUP.md`  
**Author:** GitHub Copilot  
**Date:** 2026-03-03  
**Status:** Approved  

---

## 1. Scope

This spec covers the technical implementation of the three features defined in PRD `ADMIN-QA-001`:
- Displaying the question `id` on each card
- Showing `imageUrl` (diagram URL) as a visible, copyable link
- Bulk-deleting questions whose `question` text contains `"auto-generated"`

**Files changed:**
| File | Change Type |
|---|---|
| `src/app/api/admin/questions/route.ts` | New `DELETE` handler |
| `src/app/admin/questions/page.tsx` | UI enhancements |

---

## 2. API Changes

### 2.1 New: `DELETE /api/admin/questions`

**File:** `src/app/api/admin/questions/route.ts`

**Query parameter:**
```
DELETE /api/admin/questions?filter=auto-generated
```

**Auth:** Same admin guard as existing `GET`/`PATCH` handlers.

**Logic:**

```typescript
export async function DELETE(request: NextRequest) {
  // 1. Auth check — same ADMIN_EMAILS guard
  // 2. Read `filter` query param; only 'auto-generated' is accepted
  // 3. Prisma deleteMany where question contains "auto-generated" (mode: insensitive)
  // 4. Return { deleted: count }
}
```

**Prisma Query:**

```typescript
const result = await prisma.question.deleteMany({
  where: {
    question: {
      contains: 'auto-generated',
      mode: 'insensitive'
    }
  }
})
// result.count = number of deleted records
```

> **Note:** `mode: 'insensitive'` is valid for SQL Server via Prisma's connector; it maps to a `COLLATE SQL_Latin1_General_CP1_CI_AS` comparison.

**Success response (200):**
```json
{ "deleted": 12 }
```

**Error responses:**
| Condition | Status | Body |
|---|---|---|
| Not authenticated | 401 | `{ "error": "Unauthorized" }` |
| `filter` param missing or invalid | 400 | `{ "error": "Invalid filter parameter" }` |
| Prisma / DB error | 500 | `{ "error": "Internal server error" }` |

---

## 3. Frontend Changes

### 3.1 Updated `Question` Interface

Add `diagramUrl` as an alias for `imageUrl` display; `imageUrl` is already present in the interface, no new interface field is needed. A display alias is handled in the render layer.

### 3.2 Question Card — ID Badge

**Location:** `filteredQuestions.map(...)` → card header `<div className="flex items-start justify-between ...">` → inside the left badge cluster.

**Implementation:**

```tsx
{/* Question ID Badge */}
<button
  onClick={() => navigator.clipboard.writeText(question.id)}
  title={`Click to copy full ID: ${question.id}`}
  className="font-mono text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full border border-gray-300 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 transition-all cursor-copy"
>
  ID: {question.id.slice(0, 8)}…
</button>
```

- Shows first 8 characters of the CUID followed by `…`
- Full ID in `title` tooltip
- Clicking copies the full ID to clipboard
- Uses `cursor-copy` CSS cursor to signal copyability

### 3.3 Question Card — Diagram URL Display

**Location:** Inside the existing `{/* Diagram Display */}` block, appended after the image `<div>` and before `chartData` description.

**Also** handles the case where `imageUrl` exists but `imageData` does not (URL-only diagram).

**Updated condition:**

```tsx
{(question.imageData || question.imageUrl) && (
  <div className="mb-6">
    <h4>📊 Diagram</h4>
    
    {/* Image render — existing logic unchanged */}
    {(question.imageData || question.imageUrl) && (
      <div className="border-2 ...">
        <img src={getImageDataUrl(question) || undefined} ... />
      </div>
    )}
    
    {/* NEW: Diagram URL display */}
    {question.imageUrl && (
      <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
        <span className="text-xs font-bold text-blue-700 uppercase tracking-wide flex-shrink-0">
          🔗 Diagram URL:
        </span>
        <a
          href={question.imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={question.imageUrl}
          className="text-blue-600 text-sm underline truncate hover:text-blue-800 transition-colors"
        >
          {question.imageUrl.length > 70
            ? question.imageUrl.slice(0, 70) + '…'
            : question.imageUrl}
        </a>
      </div>
    )}
    
    {/* Existing chartData description */}
    {question.chartData && ...}
  </div>
)}
```

> **Edge case:** If `imageUrl` exists but `imageData` is null, the outer condition `(question.imageData || question.imageUrl)` still evaluates to `true`, so the whole section renders. The `<img>` element will use `imageUrl` via `getImageDataUrl()`.

### 3.4 Sidebar — Danger Zone Card

**Location:** After the existing "Clear Filters" button in the sidebar filters card.

**Implementation:**

```tsx
{/* Danger Zone */}
<div className="mt-8 border-2 border-red-200 rounded-2xl p-5 bg-red-50">
  <h3 className="text-base font-bold text-red-700 mb-2 flex items-center gap-2">
    ⚠️ Danger Zone
  </h3>
  <p className="text-xs text-red-600 mb-4">
    Permanently deletes all questions containing &ldquo;auto-generated&rdquo; in their text.
  </p>
  <button
    onClick={handleDeleteAutoGenerated}
    disabled={deletingAutoGenerated}
    className="w-full bg-red-600 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50 transition-all shadow"
  >
    {deletingAutoGenerated ? '🗑️ Deleting...' : '🗑️ Delete Auto-Generated Questions'}
  </button>
  {deleteResult && (
    <p className="mt-3 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
      ✅ Deleted {deleteResult} question{deleteResult !== 1 ? 's' : ''}
    </p>
  )}
</div>
```

### 3.5 New State Variables

```typescript
const [deletingAutoGenerated, setDeletingAutoGenerated] = useState<boolean>(false)
const [deleteResult, setDeleteResult] = useState<number | null>(null)
```

### 3.6 New Handler — `handleDeleteAutoGenerated`

```typescript
const handleDeleteAutoGenerated = async () => {
  const confirmed = window.confirm(
    "This will permanently delete all questions containing 'auto-generated'. This action cannot be undone. Continue?"
  )
  if (!confirmed) return

  setDeletingAutoGenerated(true)
  setDeleteResult(null)
  setError(null)

  try {
    const response = await fetch('/api/admin/questions?filter=auto-generated', {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete questions')
    const data = await response.json()
    setDeleteResult(data.deleted)
    // Refresh the list so deleted questions disappear
    fetchQuestions(1)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to delete questions')
  } finally {
    setDeletingAutoGenerated(false)
  }
}
```

---

## 4. Data Flow Diagram

```
Admin clicks "Delete Auto-Generated"
        │
        ▼
window.confirm() ──No──► abort
        │ Yes
        ▼
DELETE /api/admin/questions?filter=auto-generated
        │
        ▼
Auth check (ADMIN_EMAILS)
        │
        ▼
prisma.question.deleteMany({ question: { contains: 'auto-generated', mode: 'insensitive' } })
        │
        ▼
Response: { deleted: N }
        │
        ▼
setDeleteResult(N) + fetchQuestions(1)
        │
        ▼
UI shows "✅ Deleted N questions" + list refreshes
```

---

## 5. Security

- The `DELETE` endpoint is guarded by the same `ADMIN_EMAILS` constant used across all admin routes — no escalation of privilege.
- The `filter` parameter is validated server-side; only the value `"auto-generated"` is accepted; anything else returns 400.
- No raw SQL is used; Prisma's parameterized `deleteMany` prevents SQL injection.

---

## 6. Testing Checklist

- [ ] Unit: `DELETE /api/admin/questions?filter=auto-generated` returns `{ deleted: N }` for questions with matching text
- [ ] Unit: Non-admin receives 401
- [ ] Unit: Invalid `filter` receives 400
- [ ] Integration: After DELETE, re-fetching questions shows none with "auto-generated"
- [ ] UI: ID badge renders with truncated ID and copy-to-clipboard works
- [ ] UI: `imageUrl` renders as link when present
- [ ] UI: `imageUrl` section hidden when `imageUrl` is null
- [ ] UI: Danger Zone button triggers confirm dialog
- [ ] UI: Dismissing confirm does NOT call DELETE
- [ ] UI: Success message shows correct count
- [ ] UI: List refreshes after successful deletion

---

## 7. Rollback Plan

All changes are additive UI features and a new API handler. Rolling back requires reverting the two modified files. There is no schema migration, so no database rollback is needed. Deleted questions cannot be recovered; this is intentional per PRD.
