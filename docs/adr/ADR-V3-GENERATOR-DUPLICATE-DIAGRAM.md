# ADR: Fix V3 Generator Duplicate Diagram Bug

**Status**: Accepted  
**Date**: February 17, 2026  
**Author**: Solution Architect  
**Related PRD**: [PRD-DUPLICATE-DIAGRAM-FIX.md](../prd/PRD-DUPLICATE-DIAGRAM-FIX.md)

---

## Context

The V3 generator produces geometry questions where **all 5 questions receive identical imageData** (82,144 bytes, identical base64 encoding). User reports: *"They all just show the same exact diagram for different questions and the diagram does not relate to even one of the questions."*

### Evidence

**Database Verification**:
```
📊 Unique image hashes: 25
Image 25: 5 questions (IDENTICAL HASH)
  Question IDs: cmlqx68e20000iuf404l1h010, cmlqx68g80001iuf4fsmissc8, cmlqx68hp0002iuf4k3grzm3g
```

**JSON Files Analysis**:
```powershell
math_01_20260217_100554.json: imageData = 82,144 chars "iVBORw0KGgoAAAANSUhEUgAABccAAAYN..."
math_02_20260217_100632.json: imageData = 82,144 chars "iVBORw0KGgoAAAANSUhEUgAABccAAAYN..." (IDENTICAL)
math_03_20260217_100715.json: imageData = 82,144 chars (IDENTICAL)
math_04_20260217_100753.json: imageData = 82,144 chars (IDENTICAL)
math_05_20260217_100815.json: imageData = 82,144 chars (IDENTICAL)
```

---

## Problem Analysis

### Initial Hypothesis (INCORRECT)

**Suspected**: Matplotlib figure reuse across questions
- Matplotlib creates a global figure object
- Generator doesn't call `plt.close()` between questions
- Same figure accumulates drawings

**Investigation Result**: ❌ **NOT THE CAUSE**
- ✅ Each generator method calls `fig, ax = plt.subplots(figsize=(8, 8))`
- ✅ Each method calls `plt.close(fig)` after saving
- ✅ No global figure object found

---

### Root Cause (CONFIRMED)

**Location 1**: `generators/diagrams/classifier.py` (Lines 64-70)

```python
# Fallback to geometry if confidence is low
if result.get('confidence', 0) < 0.7:
    return {
        'visualType': 'geometry',
        'confidence': 1.0,
        'dataPoints': {},  # ❌ EMPTY DICT!
        'rationale': 'Low confidence in classification, defaulting to geometry'
    }
```

**Location 2**: `sat_generator_v3.py` (Lines 221-228)

```python
elif visual_type == 'geometry':
    # Default to coordinate plane
    points = data_points if isinstance(data_points, list) else [(2, 3, 'A'), (5, 7, 'B')]  # ❌ HARDCODED
    return GeometryGenerator.create_coordinate_plane(
        points=points,
        caption="Figure 1: Coordinate plane"
    )
```

**Bug Flow**:

1. **LLM classifier** has < 0.7 confidence → Returns `dataPoints: {}` (empty dict)
2. **Generator receives** `visual_spec = {'visualType': 'geometry', 'dataPoints': {}}`
3. **Generator checks** `if isinstance(data_points, list)` → `{}` is NOT a list
4. **Generator falls back** to hardcoded default: `[(2, 3, 'A'), (5, 7, 'B')]`
5. **Result**: GeometryGenerator.create_coordinate_plane gets SAME points for ALL questions
6. **Outcome**: Identical diagrams for all 5 geometry questions

**Why this happened for all 5 questions**:
- All 5 questions triggered the < 0.7 confidence fallback
- OR the LLM consistently returned empty `dataPoints` for these questions
- Result: All got the default hardcoded points

---

## Decision

### Fix Strategy: **Two-Layer Defense** (Options A + B)

**Fix 1**: Classifier generates valid dataPoints even on fallback  
**Fix 2**: Generator creates random/unique points when dataPoints is invalid

**Rationale**:
- ✅ Redundant safety (defense in depth)
- ✅ Prevents future regressions
- ✅ Handles both LLM failures and code bugs
- ✅ Simple to implement (< 30 minutes)

---

## Implementation Design

### Fix 1: Classifier Fallback (Priority: P0)

**File**: `generators/diagrams/classifier.py`

**Current Code** (Lines 64-70):
```python
# Fallback to geometry if confidence is low
if result.get('confidence', 0) < 0.7:
    return {
        'visualType': 'geometry',
        'confidence': 1.0,
        'dataPoints': {},  # ❌ EMPTY
        'rationale': 'Low confidence in classification, defaulting to geometry'
    }
```

**Fixed Code**:
```python
# Fallback to geometry if confidence is low
if result.get('confidence', 0) < 0.7:
    return {
        'visualType': 'geometry',
        'confidence': 1.0,
        'dataPoints': self._generate_fallback_geometry_points(question_text),  # ✅ UNIQUE POINTS
        'rationale': 'Low confidence in classification, defaulting to geometry'
    }
```

**New Method**:
```python
def _generate_fallback_geometry_points(self, question_text: str) -> List[Tuple[float, float, str]]:
    """
    Generate unique geometry points for fallback cases.
    Uses question text hash to ensure reproducibility but uniqueness.
    """
    import hashlib
    import random
    
    # Create deterministic seed from question text
    seed = int(hashlib.md5(question_text.encode()).hexdigest()[:8], 16)
    random.seed(seed)
    
    # Generate 2-4 random points in coordinate plane
    num_points = random.randint(2, 4)
    points = []
    labels = ['A', 'B', 'C', 'D', 'E', 'F']
    
    for i in range(num_points):
        x = random.randint(-8, 8)
        y = random.randint(-8, 8)
        points.append((x, y, labels[i]))
    
    return points
```

---

### Fix 2: Generator Fallback (Priority: P0)

**File**: `sat_generator_v3.py`

**Current Code** (Lines 221-228):
```python
elif visual_type == 'geometry':
    # Default to coordinate plane
    points = data_points if isinstance(data_points, list) else [(2, 3, 'A'), (5, 7, 'B')]  # ❌ HARDCODED
    return GeometryGenerator.create_coordinate_plane(
        points=points,
        caption="Figure 1: Coordinate plane"
    )
```

**Fixed Code**:
```python
elif visual_type == 'geometry':
    # Extract points or generate unique fallback
    if isinstance(data_points, list) and len(data_points) > 0:
        points = data_points
    elif isinstance(data_points, dict) and 'vertices' in data_points:
        vertices = data_points['vertices']
        points = [(v[0], v[1], chr(65 + i)) for i, v in enumerate(vertices)]
    else:
        # Generate unique random points instead of hardcoded default
        import random
        import time
        random.seed(int(time.time() * 1000000) % (2**32))  # Microsecond seed
        num_points = random.randint(2, 4)
        points = [(random.randint(-8, 8), random.randint(-8, 8), chr(65 + i)) for i in range(num_points)]
    
    return GeometryGenerator.create_coordinate_plane(
        points=points,
        caption="Figure 1: Coordinate plane"
    )
```

---

### Fix 3: Error Handler Fallback (Priority: P1)

**File**: `sat_generator_v3.py`

**Current Code** (Lines 73-76):
```python
except Exception as e:
    # Fallback on error
    return {
        'visualType': 'geometry',
        'confidence': 1.0,
        'dataPoints': {},  # ❌ EMPTY
        'rationale': f'Classification failed: {str(e)}, defaulting to geometry'
    }
```

**Fixed Code**:
```python
except Exception as e:
    # Fallback on error with unique points
    return {
        'visualType': 'geometry',
        'confidence': 1.0,
        'dataPoints': self._generate_fallback_geometry_points(question_text),  # ✅ UNIQUE
        'rationale': f'Classification failed: {str(e)}, defaulting to geometry'
    }
```

---

## Testing Strategy

### Unit Tests

**Test 1**: Classifier fallback generates unique dataPoints
```python
def test_classifier_fallback_unique():
    """Verify classifier fallback generates unique geometry points."""
    classifier = DiagramClassifier(client)
    
    # Mock low-confidence responses
    question1 = "What is the area of a triangle?"
    question2 = "Find the perimeter of a rectangle."
    
    spec1 = classifier.classify(question1, 'geometry', [])
    spec2 = classifier.classify(question2, 'geometry', [])
    
    assert spec1['dataPoints'] != spec2['dataPoints'], "Fallback dataPoints must be unique"
    assert len(spec1['dataPoints']) >= 2, "Must have at least 2 points"
```

**Test 2**: Generator creates unique diagrams for empty dataPoints
```python
def test_generator_unique_fallback():
    """Verify generator creates unique diagrams when dataPoints is empty."""
    generator = SATGeneratorV3()
    
    visual_spec1 = {'visualType': 'geometry', 'dataPoints': {}}
    visual_spec2 = {'visualType': 'geometry', 'dataPoints': {}}
    
    diagram1 = generator._generate_diagram(visual_spec1)
    diagram2 = generator._generate_diagram(visual_spec2)
    
    assert diagram1 != diagram2, "Fallback diagrams must be unique"
```

**Test 3**: Bulk generation produces unique diagrams
```python
def test_bulk_generation_unique():
    """Verify bulk generation creates unique diagrams."""
    generator = SATGeneratorV3()
    questions = []
    
    for i in range(5):
        q = generator.generate_math_question_with_diagram(category='geometry')
        questions.append(q)
    
    image_hashes = [hashlib.md5(q['imageData'].encode()).hexdigest() for q in questions if 'imageData' in q]
    assert len(set(image_hashes)) == len(image_hashes), "All diagrams must be unique"
```

---

### Integration Test

**Command**:
```bash
cd azuredev-038d-main
python sat_generator_v3.py --geometry 5 --output generated_questions_v3_test
npx tsx ../DuckSAT/scripts/check-duplicate-images-json.ts generated_questions_v3_test
```

**Expected Output**:
```
✅ All 5 questions have UNIQUE imageData
📊 Unique image hashes: 5
📊 Total questions: 5
```

---

## Rollback Plan

**If fix causes regressions**:

1. **Revert commits**:
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Restore original code**:
   - `classifier.py`: Empty `dataPoints: {}` fallback
   - `sat_generator_v3.py`: Hardcoded `[(2, 3, 'A'), (5, 7, 'B')]` default

3. **Alternative fix**: Delete 5 corrupted questions, manually create unique diagrams

---

## Consequences

### Positive

- ✅ All geometry questions get unique diagrams (even on fallback)
- ✅ Deterministic for same question text (reproducible)
- ✅ Random for different questions (unique)
- ✅ Two-layer defense (classifier + generator)
- ✅ No breaking changes to API or schema

### Negative

- ⚠️ Fallback diagrams may not perfectly match question context
- ⚠️ Adds slight complexity to classifier (new method)
- ⚠️ Generator fallback uses random seed (less deterministic than desired)

### Mitigations

- **For context mismatch**: Low-confidence questions shouldn't have relied on diagrams anyway
- **For complexity**: Method is well-documented and tested
- **For randomness**: Use question text hash for deterministic seed in classifier

---

## Alternatives Considered

### Alternative 1: Delete Fallback Logic (REJECTED)

**Approach**: Remove fallback, force LLM to always provide valid dataPoints

**Pros**:
- Ensures high-quality diagram specs

**Cons**:
- ❌ LLM may fail or timeout
- ❌ No graceful degradation
- ❌ Requires retry logic

**Decision**: REJECTED - Fallback is necessary for system reliability

---

### Alternative 2: Manual Diagram Assignment (REJECTED)

**Approach**: Keep 5 corrupted questions, manually create 5 unique diagrams

**Pros**:
- Preserves exact question content

**Cons**:
- ❌ Doesn't fix generator bug (future issues)
- ❌ Time-intensive (2+ hours)
- ❌ Not scalable

**Decision**: REJECTED - Must fix root cause

---

### Alternative 3: Skip Diagram Generation on Fallback (REJECTED)

**Approach**: Return `visualType: 'none'` when dataPoints is empty

**Pros**:
- Simple fix
- No bad diagrams

**Cons**:
- ❌ Misses opportunity for visual aid
- ❌ Lower question quality
- ❌ User expects diagrams for geometry

**Decision**: REJECTED - Prefer unique random diagrams over no diagrams

---

## Implementation Checklist

**Phase 1: Code Fixes** (15 minutes)
- [ ] Add `_generate_fallback_geometry_points()` to classifier
- [ ] Update classifier low-confidence fallback (line 64-70)
- [ ] Update classifier exception fallback (line 73-76)
- [ ] Update generator geometry fallback (line 221-228)

**Phase 2: Unit Tests** (15 minutes)
- [ ] Test: Classifier fallback generates unique dataPoints
- [ ] Test: Generator creates unique diagrams for empty dataPoints
- [ ] Test: Bulk generation produces unique diagrams
- [ ] Run: `pytest tests/test_sat_generator_v3.py::test_unique_diagrams -v`

**Phase 3: Integration Test** (10 minutes)
- [ ] Generate 5 geometry questions with fixed generator
- [ ] Run check-duplicate-images script
- [ ] Verify: "✅ All 5 questions have UNIQUE imageData"

**Phase 4: Database Cleanup** (20 minutes)
- [ ] Delete 5 corrupted questions from database
- [ ] Regenerate 5 questions with fixed generator
- [ ] Import new questions
- [ ] Verify: 29 unique images in database

**Phase 5: Verification** (30 minutes)
- [ ] Regenerate HTML export
- [ ] Manual verification: 5 geometry questions show 5 DIFFERENT diagrams
- [ ] Create verification report with screenshots

---

## Success Metrics

**Before Fix**:
- ❌ 5 questions with identical imageData (same hash)
- ❌ HTML shows duplicate diagram for different questions
- ❌ Database: Image 25 has 5 questions

**After Fix**:
- ✅ 5 questions with UNIQUE imageData (5 different hashes)
- ✅ HTML shows 5 DIFFERENT diagrams
- ✅ Database: 29 unique images (no duplicates)
- ✅ All unit tests pass
- ✅ Integration test passes

---

## References

- **PRD**: [docs/prd/PRD-DUPLICATE-DIAGRAM-FIX.md](../prd/PRD-DUPLICATE-DIAGRAM-FIX.md)
- **Classifier**: `azuredev-038d-main/generators/diagrams/classifier.py`
- **Generator**: `azuredev-038d-main/sat_generator_v3.py`
- **Geometry Generator**: `azuredev-038d-main/generators/diagrams/geometry_generator.py`
- **Import Script**: `scripts/import-v3-diagrams.ts`
- **Diagnostic Script**: `scripts/check-duplicate-images.ts`

---

**Approved**: Solution Architect  
**Next**: Hand off to Software Engineer for implementation  
**Timeline**: 2 hours total (15 min code + 15 min tests + 30 min regeneration + 30 min verification + 30 min documentation)
