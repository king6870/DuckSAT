# PRD: Fix Duplicate Diagram Issue in V3 Generator

**Epic**: Question Generation System  
**Status**: Ready for Architecture  
**Priority**: P0 (Critical - System Unusable)  
**Created**: February 17, 2026  
**Owner**: Product Manager → Solution Architect → Software Engineer  
**Target Completion**: 2 hours

---

## 1. Executive Summary

### Problem Statement
The HTML export displays 19 diagrams, but **all diagrams are identical** despite being attached to different geometry questions. User reports: *"They all just show the same exact diagram for different questions and the diagram does not relate to even one of the questions."*

### Root Cause (Confirmed)
The V3 generator (`sat_generator_v3.py`) generated 5 geometry questions with diagrams, but **all 5 questions received the SAME imageData** (82,144 bytes, identical base64 encoding). The generator bug causes diagram reuse across multiple questions.

**Evidence**:
```powershell
# All 5 JSON files have identical imageData
math_01_20260217_100554.json: 82,144 chars, starts with "iVBORw0KGgoAAAANSUhEUgAABccAAAYN..."
math_02_20260217_100632.json: 82,144 chars, starts with "iVBORw0KGgoAAAANSUhEUgAABccAAAYN..."
math_03_20260217_100715.json: 82,144 chars, (identical)
math_04_20260217_100753.json: 82,144 chars, (identical)
math_05_20260217_100815.json: 82,144 chars, (identical)
```

Database verification shows **5 questions share the same imageData hash**:
```
Image 25: 5 questions
  Question IDs: cmlqx68e20000iuf404l1h010, cmlqx68g80001iuf4fsmissc8, cmlqx68hp0002iuf4k3grzm3g...
```

### Impact
- **User Experience**: Unusable - diagrams don't match questions
- **Data Integrity**: 5 questions in database have wrong diagrams
- **Trust**: User frustrated after multiple fix attempts
- **Timeline**: Blocks HTML export feature, blocks practice test integration

---

## 2. Technical Analysis

### Affected Components

| Component | Issue | Status |
|-----------|-------|--------|
| `sat_generator_v3.py` | Reuses same matplotlib figure across questions | ❌ ROOT CAUSE |
| `import-v3-diagrams.ts` | Imports duplicate imageData without validation | ⚠️ NEEDS VALIDATION |
| `export-questions-to-html.ts` | Correctly fetches/displays imageData (not the bug) | ✅ WORKING |
| Database (5 questions) | Contains duplicate imageData | ❌ CORRUPTED DATA |

### V3 Generator Bug Analysis

**File**: `azuredev-038d-main/sat_generator_v3.py`

**Suspected Issue**: Matplotlib figure object (`plt.figure()` or global `plt`) not cleared between questions.

**Typical Bug Pattern**:
```python
# ❌ WRONG: Reuses same figure
fig = plt.figure()  # Created once OUTSIDE loop

for question in questions:
    plt.plot(...)  # Adds to SAME figure
    img_data = save_figure_to_base64(fig)
    question['imageData'] = img_data  # All get same image
```

**Correct Pattern**:
```python
# ✅ CORRECT: New figure per question
for question in questions:
    fig = plt.figure()  # Fresh figure EACH iteration
    plt.plot(...)
    img_data = save_figure_to_base64(fig)
    question['imageData'] = img_data
    plt.close(fig)  # Clean up
```

### Database State

```
Total questions: 95
Questions with imageData: 29
  - 24 questions: UNIQUE diagrams ✅
  - 5 questions (V3 import): DUPLICATE diagram ❌

Corrupted question IDs:
  - cmlqx68e20000iuf404l1h010
  - cmlqx68g80001iuf4fsmissc8
  - cmlqx68hp0002iuf4k3grzm3g
  - (2 more, total 5)
```

---

## 3. Solution Architecture

### Option A: Fix V3 Generator + Regenerate (RECOMMENDED)

**Approach**: Fix matplotlib figure reuse bug, regenerate 5 questions, replace corrupted data

**Implementation Steps**:
1. **Architect**: Analyze `sat_generator_v3.py` diagram generation logic
2. **Engineer**: Fix matplotlib figure clearing (add `plt.figure()` per question)
3. **Engineer**: Add validation - verify imageData uniqueness before saving
4. **Engineer**: Regenerate 5 geometry questions
5. **Engineer**: Delete 5 corrupted questions from database
6. **Engineer**: Import 5 new questions with unique diagrams
7. **Verification**: Regenerate HTML, verify 5 unique diagrams display

**Pros**:
- ✅ Fixes root cause permanently
- ✅ Ensures future V3 generations work correctly
- ✅ Clean data (no manual fixes)

**Cons**:
- ⚠️ Requires Python code analysis/fix
- ⚠️ Regenerates questions (different content, but that's OK)

**Time Estimate**: 1.5 hours
- Analysis: 15 min
- Fix: 30 min
- Regenerate + Import: 20 min
- Verification: 15 min
- Documentation: 10 min

---

### Option B: Manual Diagram Replacement (NOT RECOMMENDED)

**Approach**: Keep 5 questions, manually create 5 unique diagrams

**Cons**:
- ❌ Doesn't fix generator bug (future issues)
- ❌ Manual diagram creation time-intensive
- ❌ Diagram quality may not match V3 style

**Time Estimate**: 2+ hours (rejected)

---

### Option C: Delete + Generate One-by-One (FALLBACK)

**Approach**: Delete corrupted questions, generate questions individually to avoid batch bug

**Pros**:
- ✅ Bypasses generator bug without fix
- ✅ Ensures uniqueness

**Cons**:
- ⚠️ Doesn't fix root cause
- ⚠️ Time-consuming (5 separate generations)

**Time Estimate**: 1 hour

---

## 4. Technical Requirements

### FR1: Fix V3 Generator Matplotlib Figure Reuse

**Priority**: P0 (Critical)

**Requirements**:
- **FR1.1**: Analyze `sat_generator_v3.py` to locate diagram generation code
- **FR1.2**: Identify where matplotlib figure is created and reused
- **FR1.3**: Add `plt.figure()` call at start of each question generation
- **FR1.4**: Add `plt.close(fig)` after saving imageData
- **FR1.5**: Add unit test: Generate 3 questions, verify 3 DIFFERENT imageData values

**Acceptance Criteria**:
- [ ] V3 generator creates unique imageData for each question
- [ ] Test: Generate 5 questions → 5 unique imageData hashes
- [ ] No matplotlib memory leaks (all figures closed)

---

### FR2: Add Import Validation

**Priority**: P1 (High)

**Requirements**:
- **FR2.1**: Update `import-v3-diagrams.ts` to validate imageData uniqueness
- **FR2.2**: Before import, check if imageData already exists in database
- **FR2.3**: Reject import if duplicate imageData detected
- **FR2.4**: Log warning if multiple questions in import batch have same imageData

**Acceptance Criteria**:
- [ ] Import script rejects duplicate imageData
- [ ] Import script logs: "⚠️ Question X has duplicate imageData (hash: ...)"
- [ ] Import fails if >1 question in batch shares imageData

---

### FR3: Database Cleanup

**Priority**: P0 (Critical)

**Requirements**:
- **FR3.1**: Create script to delete 5 corrupted questions by ID
- **FR3.2**: Verify deletion (count questions with imageData = 24 after cleanup)
- **FR3.3**: Import 5 new V3-generated questions with unique diagrams

**Acceptance Criteria**:
- [ ] 5 corrupted questions deleted from database
- [ ] 5 new questions imported with unique imageData
- [ ] Total questions with imageData = 29 (24 original + 5 new)
- [ ] Database integrity check passes

---

### FR4: HTML Export Verification

**Priority**: P0 (Critical)

**Requirements**:
- **FR4.1**: Regenerate HTML export after data cleanup
- **FR4.2**: Verify 29 diagrams display (not 19)
- **FR4.3**: Verify each diagram is UNIQUE (no duplicates)
- **FR4.4**: Verify diagrams match question content (geometry questions show geometry diagrams)

**Acceptance Criteria**:
- [ ] HTML file size ≥ 2 MB (29 unique diagrams)
- [ ] Manual verification: Open HTML, check first 10 questions with diagrams - all unique
- [ ] No yellow "pending generation" notices for questions with diagrams

---

## 5. Implementation Plan

### Phase 1: Analysis (15 minutes)

**Agent**: Solution Architect

**Tasks**:
1. Read `azuredev-038d-main/sat_generator_v3.py` (focus on diagram generation)
2. Identify matplotlib figure lifecycle:
   - Where is `plt.figure()` called?
   - Is figure reused across questions?
   - Is `plt.close()` called?
3. Create Architecture Decision Record (ADR):
   - Document bug location
   - Document fix approach (figure per question)
   - Document testing strategy

**Deliverable**: `docs/adr/ADR-V3-GENERATOR-DIAGRAM-FIX.md`

---

### Phase 2: V3 Generator Fix (30 minutes)

**Agent**: Software Engineer

**Tasks**:
1. **Fix diagram generation loop** in `sat_generator_v3.py`:
   ```python
   # Add at start of question generation loop
   fig = plt.figure(figsize=(18, 13))
   
   # ... (existing diagram code) ...
   
   # Add after saving imageData
   plt.close(fig)
   ```

2. **Add uniqueness test**:
   ```python
   def test_unique_diagrams():
       questions = generate_questions(count=3, type='geometry')
       hashes = [hash_image_data(q['imageData']) for q in questions]
       assert len(set(hashes)) == 3, "All diagrams must be unique"
   ```

3. **Run tests**: `pytest tests/test_sat_generator_v3.py -v`

**Deliverable**:
- Fixed `sat_generator_v3.py`
- New test: `test_unique_diagrams()`
- Test output: "✅ All tests passed"

---

### Phase 3: Database Cleanup + Regeneration (30 minutes)

**Agent**: Software Engineer

**Tasks**:

1. **Create cleanup script** (`scripts/cleanup-duplicate-diagrams.ts`):
   ```typescript
   const duplicateIDs = [
     'cmlqx68e20000iuf404l1h010',
     'cmlqx68g80001iuf4fsmissc8',
     'cmlqx68hp0002iuf4k3grzm3g',
     // ... (all 5 IDs)
   ];
   
   await prisma.question.deleteMany({
     where: { id: { in: duplicateIDs } }
   });
   ```

2. **Run cleanup**: `npx tsx scripts/cleanup-duplicate-diagrams.ts`

3. **Regenerate questions**:
   ```bash
   cd azuredev-038d-main
   python sat_generator_v3.py --geometry 5 --output generated_questions_v3_fixed
   ```

4. **Import new questions**: `npx tsx scripts/import-v3-diagrams.ts --source generated_questions_v3_fixed`

5. **Verify uniqueness**: `npx tsx scripts/check-duplicate-images.ts`

**Deliverable**:
- 5 corrupted questions deleted
- 5 new questions imported
- Check output: "✅ 29 unique images found"

---

### Phase 4: HTML Export + Verification (15 minutes)

**Agent**: Software Engineer

**Tasks**:

1. **Regenerate HTML**:
   ```bash
   npx tsx scripts/export-questions-to-html.ts
   ```

2. **Verify file size**: Should be ≥ 2 MB (29 unique diagrams)

3. **Manual verification**:
   - Open HTML in browser
   - Check questions 1-10 with diagrams
   - Verify each diagram is DIFFERENT
   - Verify diagrams match question content

4. **Create verification report**:
   - Screenshot of 5 unique diagrams
   - File size confirmation
   - Diagram count confirmation

**Deliverable**:
- `output/html/50-questions-display.html` (updated)
- `docs/verification/DUPLICATE-DIAGRAM-FIX-VERIFICATION.md`
- Screenshots in `docs/verification/screenshots/`

---

## 6. Testing Strategy

### Unit Tests

| Test | Location | Purpose |
|------|----------|---------|
| `test_unique_diagrams()` | `tests/test_sat_generator_v3.py` | Verify each question gets unique imageData |
| `test_figure_cleanup()` | `tests/test_sat_generator_v3.py` | Verify matplotlib figures closed properly |

### Integration Tests

| Test | Command | Expected Result |
|------|---------|-----------------|
| Import Validation | `npx tsx scripts/import-v3-diagrams.ts` | Reject if duplicate imageData detected |
| Database Cleanup | `npx tsx scripts/check-duplicate-images.ts` | 29 unique images, no duplicates |
| HTML Export | `npx tsx scripts/export-questions-to-html.ts` | File ≥ 2 MB, 29 diagrams embedded |

### Manual Verification Checklist

**Before Fix**:
- [x] HTML shows 19 diagrams
- [x] All 19 diagrams are IDENTICAL
- [x] Database has 5 questions with duplicate imageData
- [x] V3 JSON files have identical imageData (82,144 chars)

**After Fix** (Target State):
- [ ] HTML shows 29 diagrams (or more if new questions added)
- [ ] All diagrams are UNIQUE (no duplicates)
- [ ] Visual verification: 5 geometry questions show 5 DIFFERENT diagrams
- [ ] Database `check-duplicate-images.ts` shows: "29 unique images" or "25 unique images + 1 group of 5" → fixed to 29 unique
- [ ] V3 generator test: Generate 5 questions → 5 unique imageData hashes

---

## 7. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| V3 generator has multiple diagram bugs | Medium | High | Thorough code review of entire diagram generation flow |
| Matplotlib version incompatibility | Low | Medium | Test fix on same Python environment as original generation |
| Database constraint violations during cleanup | Low | Medium | Use transactions, rollback on error |
| New questions have different difficulty | Low | Low | Acceptable - focus on fixing diagrams, not preserving exact questions |

---

## 8. Success Criteria

### Must Have (P0)

- [x] Root cause identified (V3 generator matplotlib figure reuse)
- [ ] V3 generator fixed (unique figure per question)
- [ ] 5 corrupted questions deleted from database
- [ ] 5 new questions with UNIQUE diagrams imported
- [ ] HTML export shows 29 unique diagrams
- [ ] Manual verification: 5 geometry questions show 5 DIFFERENT diagrams

### Should Have (P1)

- [ ] Import script validation (reject duplicate imageData)
- [ ] Unit test: `test_unique_diagrams()` passes
- [ ] Documentation: ADR for V3 generator fix

### Nice to Have (P2)

- [ ] Automated visual regression test (compare diagram thumbnails)
- [ ] Database integrity check script (run on CI/CD)

---

## 9. Rollout Plan

### Stage 1: Fix + Test (Architect + Engineer, 1 hour)
1. Architect analyzes V3 generator, creates ADR
2. Engineer fixes matplotlib figure reuse bug
3. Engineer adds unit test, verifies fix

### Stage 2: Database Cleanup (Engineer, 30 minutes)
1. Delete 5 corrupted questions
2. Regenerate 5 questions with fixed generator
3. Import new questions
4. Verify uniqueness

### Stage 3: Verification (Engineer, 15 minutes)
1. Regenerate HTML export
2. Manual verification in browser
3. Create verification report

### Stage 4: Documentation (Engineer, 15 minutes)
1. Update `NEXT_STEPS.md`
2. Create ADR (if not done by Architect)
3. Add screenshots to verification report

---

## 10. Timeline

**Total Estimated Time**: 2 hours

| Phase | Duration | Agent | Deliverable |
|-------|----------|-------|-------------|
| Analysis | 15 min | Architect | ADR document |
| V3 Generator Fix | 30 min | Engineer | Fixed `sat_generator_v3.py` + test |
| Database Cleanup | 30 min | Engineer | 5 questions deleted/replaced |
| HTML Verification | 15 min | Engineer | Verified HTML export |
| Documentation | 30 min | Engineer | Verification report, ADR |

**Target Completion**: February 17, 2026, 2:00 PM (2 hours from now: 12:00 PM)

---

## 11. Open Questions

1. **Should we regenerate ALL 29 diagrams for consistency?**
   - **Answer**: No - only fix the 5 corrupted ones. The other 24 are unique and correct.

2. **Should we add visual regression testing?**
   - **Answer**: P2 (nice-to-have). Focus on functional fix first.

3. **Should we update ALL existing V3-generated questions in database?**
   - **Answer**: Only if they have duplicate diagrams. Check with `check-duplicate-images.ts` first.

---

## 12. Appendix

### A. Root Cause Evidence

**Database Query Results**:
```
📊 Unique image hashes: 25
📊 Total questions with images: 29

Image 25: 5 questions  ← DUPLICATE!
  Question IDs: cmlqx68e20000iuf404l1h010, cmlqx68g80001iuf4fsmissc8, cmlqx68hp0002iuf4k3grzm3g...
```

**V3 JSON Files Analysis**:
```powershell
math_01_20260217_100554.json: imageData length = 82,144 chars
math_02_20260217_100632.json: imageData length = 82,144 chars  ← IDENTICAL
math_03_20260217_100715.json: imageData length = 82,144 chars  ← IDENTICAL
math_04_20260217_100753.json: imageData length = 82,144 chars  ← IDENTICAL
math_05_20260217_100815.json: imageData length = 82,144 chars  ← IDENTICAL

First 80 chars of imageData:
iVBORw0KGgoAAAANSUhEUgAABccAAAYNCAYAAAAP8eNsAAAAOn...  ← ALL IDENTICAL
```

### B. Related Issues

- **Session 3 Issue #1**: Math symbols not rendering → Fixed with KaTeX
- **Session 3 Issue #2**: Math query missing imageData fields → Fixed
- **Session 3 Issue #3** (CURRENT): V3 generator creates duplicate diagrams

### C. References

- Original PRD: `docs/prd/PRD-50-QUESTIONS.md`
- Diagram Export Fix: `docs/prd/PRD-DIAGRAM-EXPORT-FIX.md`
- V3 Generator: `azuredev-038d-main/sat_generator_v3.py`
- Import Script: `scripts/import-v3-diagrams.ts`
- Export Script: `scripts/export-questions-to-html.ts`

---

**Status**: Ready for handoff to Solution Architect  
**Next Steps**:
1. Solution Architect: Analyze V3 generator, create ADR
2. Software Engineer: Implement fix per ADR
3. Software Engineer: Database cleanup + verification

**User Expectation**: "THIS SHOULD ALL BE FIXED AND DONE BY THEN" (1-2 hours)

✅ **PRD Complete** - Ready for Architecture Design
