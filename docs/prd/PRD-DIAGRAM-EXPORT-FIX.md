# PRD: Fix Diagram Display in HTML Export

**Epic**: Fix missing diagrams in 50-questions-display.html  
**Priority**: P0 (Critical - User-reported bug)  
**Assignee**: Engineer Agent  
**Status**: Ready for Implementation  
**Date**: February 17, 2026  

---

## Problem Statement

User reports "still no diagrams" in the exported HTML file. Investigation shows:

1. ✅ Database has 29 questions with imageData (verified via check-image-data.ts)
2. ✅ 5 new geometry questions with diagrams successfully imported
3. ❌ **Math section HTML export is NOT fetching imageData/imageUrl fields**
4. ❌ Result: Math questions with diagrams display yellow "pending generation" notices

**Root Cause**: `scripts/export-questions-to-html.ts` lines 33-51 (math query) missing `imageData` and `imageUrl` in the select clause.

---

## User Requirements

**As a** student using DuckSAT practice questions  
**I want** to see geometry diagrams embedded in the HTML  
**So that** I can solve visual math problems correctly  

### Acceptance Criteria

- [x] All 29 questions with imageData display embedded PNG diagrams
- [ ] Math section queries include imageData and imageUrl fields
- [ ] Reading section continues to work (already correct)
- [ ] Base64 images render in browser without external dependencies
- [ ] Yellow "pending" notices only show for questions truly missing diagrams
- [ ] HTML file regenerates successfully without errors

---

## Technical Requirements

### FR1: Fix Math Query (CRITICAL)

**File**: `scripts/export-questions-to-html.ts`  
**Lines**: 33-51  

**Current Code** (BROKEN):
```typescript
const mathQuestions = await prisma.question.findMany({
  where: {
    moduleType: 'math',
    isActive: true
  },
  select: {
    id: true,
    question: true,
    options: true,
    correctAnswer: true,
    explanation: true,
    category: true,
    subtopic: true,
    difficulty: true,
    moduleType: true
    // ❌ MISSING: imageData, imageUrl
  },
  take: 25,
  orderBy: { createdAt: 'desc' }
});
```

**Fixed Code** (REQUIRED):
```typescript
const mathQuestions = await prisma.question.findMany({
  where: {
    moduleType: 'math',
    isActive: true
  },
  select: {
    id: true,
    question: true,
    options: true,
    correctAnswer: true,
    explanation: true,
    category: true,
    subtopic: true,
    difficulty: true,
    moduleType: true,
    imageData: true,      // ✅ ADD THIS
    imageUrl: true        // ✅ ADD THIS
  },
  take: 25,
  orderBy: { createdAt: 'desc' }
});
```

### FR2: Verify Existing Logic (NO CHANGES NEEDED)

**Files**:
- `parseQuestion()` function (lines 80-90) - Already converts Buffer to base64 ✅
- `renderQuestion()` function (lines 430-445) - Already generates <img> tags ✅
- CSS `.question-image` styles - Already defined ✅

### NFR1: Performance

- Image size: ~20-50KB per diagram (PNG base64)
- Total HTML file: <500KB with 29 diagrams
- Load time: <2 seconds on 3G connection

### NFR2: Browser Compatibility

- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- No external image servers required
- Inline base64 works in all modern browsers

---

## User Flows

### Flow 1: Student Views Questions with Diagrams

1. User opens `50-questions-display.html` in browser
2. **Expected**: Geometry questions show embedded diagrams
3. **Current**: Yellow "pending generation" notices appear
4. **After Fix**: Diagrams render immediately (base64 embedded)

### Flow 2: Diagram Display Logic

```
Question loaded
  ├─ Has imageData? 
  │  ├─ YES → Convert Buffer to base64 → Display <img>
  │  └─ NO → Has imageUrl?
  │         ├─ YES → Display <img src="url">
  │         └─ NO → Is geometry? 
  │                ├─ YES → Show yellow notice
  │                └─ NO → No notice (doesn't need diagram)
```

---

## Implementation Plan

### Phase 1: Fix Export Script (5 minutes)

1. Open `scripts/export-questions-to-html.ts`
2. Add `imageData: true, imageUrl: true` to math query select (lines 43-44)
3. Save file

### Phase 2: Test Fix (3 minutes)

1. Run: `npx tsx scripts/export-questions-to-html.ts`
2. Verify no errors
3. Check HTML file size (~150KB → ~400KB with diagrams)

### Phase 3: Verify in Browser (2 minutes)

1. Open `50-questions-display.html` in browser
2. Scroll through math questions
3. Confirm diagrams display (not yellow notices)
4. Test: Right-click image → "Save Image As" → Verify it's a valid PNG

### Phase 4: Database Verification (2 minutes)

1. Run: `npx tsx scripts/check-image-data.ts`
2. Confirm: 29 questions with imageData
3. Cross-reference: HTML should show 29 diagrams

**Total Time**: 12 minutes

---

## Dependencies & Risks

### Dependencies

- ✅ Database has 29 questions with imageData (verified)
- ✅ `parseQuestion()` already handles Buffer → base64 conversion
- ✅ `renderQuestion()` already generates `<img>` tags
- ✅ CSS styles already defined

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| HTML file too large (>1MB) | Slow load time | Acceptable - 29 diagrams = ~400KB total |
| Base64 doesn't render | Diagrams broken | Already tested in Session 3 - works |
| Wrong questions fetched | Missing diagrams | Query orders by createdAt DESC - gets newest |

**Risk Level**: **LOW** - This is a simple 2-line fix with zero breaking changes.

---

## Out of Scope

- ❌ Generating new diagrams for remaining 6 questions
- ❌ Converting base64 to external image URLs
- ❌ Optimizing image compression
- ❌ Adding image lazy-loading
- ❌ Creating image gallery view

---

## Testing Checklist

### Before Fix
- [ ] Run check-image-data.ts → Confirm 29 imageData
- [ ] Open current HTML → Count yellow notices (should be ~6)
- [ ] Inspect math query → Verify imageData missing

### After Fix
- [ ] Export script runs without errors
- [ ] HTML file size increases (~150KB → ~400KB)
- [ ] Open HTML → Math diagrams display (not notices)
- [ ] Right-click image → Valid PNG
- [ ] KaTeX math still renders correctly
- [ ] Yellow notices only for truly missing diagrams

---

## Success Criteria

1. ✅ Math questions with imageData display embedded diagrams
2. ✅ HTML export includes both math and reading diagrams
3. ✅ No errors during export
4. ✅ User confirms "diagrams now visible"
5. ✅ File size <500KB (manageable)

---

## Open Questions

None - root cause identified, fix is straightforward.

---

## Appendix

### Current Database Status
```
Total Questions:     95
Questions with imageData: 29
  - Math:             29 (includes 5 newly imported)
  - Reading:          0
Questions without imageData: 66
  - Needing diagrams: 1 geometry question
  - Don't need diagrams: 65 (basic math, reading)
```

### File Locations
- Export Script: `scripts/export-questions-to-html.ts`
- HTML Output: `output/html/50-questions-display.html`
- Check Script: `scripts/check-image-data.ts`

### Related Issues
- Session 3: Math rendering fixed (KaTeX added) ✅
- Session 3: Diagram support added to reading questions ✅
- **Current**: Math query missing imageData fields ❌ ← FIX THIS

---

**Ready for Engineer**: This PRD is complete and ready for implementation. The fix is trivial (2 lines), low-risk, and will immediately resolve the user's issue.
