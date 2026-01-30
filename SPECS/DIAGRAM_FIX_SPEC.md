# 🔍 DIAGRAM DISPLAY BUG - ROOT CAUSE ANALYSIS & FIX SPEC

## Problem Statement
Diagrams are not displaying in the question viewer despite being generated.

## Root Cause Analysis

### Issue 1: Data Structure Mismatch ❌
**Location**: `sat_unified_generator_v4.py` lines 327-333

**Current Behavior**:
```python
"chartData": {
    "description": question_data.get('diagramDescription'),
    "hasImage": diagram_base64 is not None,
    "base64": diagram_base64  # ❌ Stored here, not in imageData
}
```

**Viewer Expectation** (`question-viewer.html` line ~180):
```javascript
if (q.imageData || q.chartData) {
    if (q.imageData) {  // ❌ Looks here first
        document.getElementById('diagram-image').src = 
            q.imageData.startsWith('data:') ? q.imageData : `data:image/png;base64,${q.imageData}`;
```

**Problem**: Generator puts base64 in `chartData.base64`, viewer looks in `imageData` field.

### Issue 2: Sample Questions Have No Actual Images ❌
**Location**: `generate_sample_questions.py` lines 147-151

**Current Behavior**:
```python
"imageData": None,  # ❌ No image data
"imageMimeType": None,
"imageAlt": None,
"chartData": {
    "description": "..."  # ❌ Only text description, no actual image
}
```

**Problem**: Sample questions only have descriptions, no base64 image data to display.

### Issue 3: Export Function Doesn't Move Base64 to imageData ❌
**Location**: `sat_unified_generator_v4.py` export_question_to_json()

**Problem**: When `diagram_base64` is passed, it goes into `chartData.base64` instead of `imageData`.

**Expected Flow**:
1. Generate diagram → base64 string
2. Store in `imageData` field with proper format
3. Keep description in `chartData.description`
4. Viewer reads `imageData` and displays

## Fix Specification

### Fix 1: Update Export Function in sat_unified_generator_v4.py ✅

**File**: `scripts/sat_unified_generator_v4.py`  
**Function**: `export_question_to_json()`  
**Line**: ~320-335

**Change**:
```python
# BEFORE (BROKEN):
"imageUrl": None,
"imageData": None,  # ❌ Not set
"imageMimeType": None,
"imageAlt": None,
"chartData": {
    "description": question_data.get('diagramDescription'),
    "hasImage": diagram_base64 is not None,
    "base64": diagram_base64  # ❌ Wrong location
}

# AFTER (FIXED):
"imageUrl": None,
"imageData": f"data:image/png;base64,{diagram_base64}" if diagram_base64 else None,  # ✅ Proper format
"imageMimeType": "image/png" if diagram_base64 else None,
"imageAlt": question_data.get('diagramDescription'),
"chartData": {
    "description": question_data.get('diagramDescription')
} if question_data.get('diagramDescription') else None,
```

### Fix 2: Add Sample Diagram Images to generate_sample_questions.py ✅

**File**: `scripts/generate_sample_questions.py`  
**Function**: `export_question_to_json()`  
**Action**: Create simple base64 diagram images for Geometry and Data questions

**Add at top of file**:
```python
import base64
from io import BytesIO
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np

def create_sample_diagram(diagram_type: str) -> str:
    """Generate simple sample diagram as base64."""
    fig, ax = plt.subplots(figsize=(8, 6))
    
    if diagram_type == 'right_triangle':
        # Draw 3-4-5 right triangle
        triangle = plt.Polygon([(0, 0), (3, 0), (3, 4)], 
                              fill=False, edgecolor='black', linewidth=2)
        ax.add_patch(triangle)
        ax.plot([0, 3], [0, 0], 'b-', linewidth=2)  # base
        ax.plot([3, 3], [0, 4], 'b-', linewidth=2)  # height
        ax.plot([0, 3], [0, 4], 'r-', linewidth=2)  # hypotenuse
        ax.text(1.5, -0.5, '3', fontsize=14, ha='center')
        ax.text(3.5, 2, '4', fontsize=14, ha='center')
        ax.text(1.2, 2.2, '5', fontsize=14, ha='center', color='red')
        ax.set_xlim(-1, 5)
        ax.set_ylim(-1, 5)
        
    elif diagram_type == 'data_chart':
        # Simple bar chart
        values = [2, 4, 6, 8, 10]
        ax.bar(range(len(values)), values, color='steelblue', edgecolor='black')
        ax.set_ylabel('Value', fontsize=12)
        ax.set_xlabel('Data Point', fontsize=12)
        ax.set_title('Dataset Values', fontsize=14)
        ax.grid(axis='y', alpha=0.3)
    
    ax.set_aspect('equal' if diagram_type == 'right_triangle' else 'auto')
    ax.axis('off' if diagram_type == 'right_triangle' else 'on')
    plt.tight_layout()
    
    # Convert to base64
    buffer = BytesIO()
    plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight', facecolor='white')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode()
    plt.close()
    
    return img_base64
```

**Update export function**:
```python
def export_question_to_json(question_data, question_type):
    # ... existing code ...
    
    # Generate sample diagrams
    diagram_base64 = None
    if question_type == 'Geometry' and question_data.get('diagramDescription'):
        diagram_base64 = create_sample_diagram('right_triangle')
    elif question_type == 'Data' and question_data.get('diagramDescription'):
        diagram_base64 = create_sample_diagram('data_chart')
    
    return {
        # ... other fields ...
        "imageData": f"data:image/png;base64,{diagram_base64}" if diagram_base64 else None,
        "imageMimeType": "image/png" if diagram_base64 else None,
        "imageAlt": question_data.get('diagramDescription'),
        "chartData": {
            "description": question_data.get('diagramDescription')
        } if question_data.get('diagramDescription') else None,
        # ... rest of fields ...
    }
```

### Fix 3: Update Viewer to Handle Both Formats (Defensive) ✅

**File**: `public/question-viewer.html`  
**Line**: ~180-200  
**Action**: Check both `imageData` and `chartData.base64` for backwards compatibility

**Change**:
```javascript
// BEFORE:
if (q.imageData || q.chartData) {
    if (q.imageData) {
        document.getElementById('diagram-image').src = 
            q.imageData.startsWith('data:') ? q.imageData : `data:image/png;base64,${q.imageData}`;
        document.getElementById('diagram-image').style.display = 'block';
    }
    // ...
}

// AFTER (with fallback):
if (q.imageData || q.chartData) {
    // Try imageData first (proper format)
    let imageSource = null;
    if (q.imageData) {
        imageSource = q.imageData.startsWith('data:') ? q.imageData : `data:image/png;base64,${q.imageData}`;
    } 
    // Fallback to chartData.base64 (legacy format)
    else if (q.chartData?.base64) {
        imageSource = `data:image/png;base64,${q.chartData.base64}`;
    }
    
    if (imageSource) {
        document.getElementById('diagram-image').src = imageSource;
        document.getElementById('diagram-image').style.display = 'block';
    } else {
        document.getElementById('diagram-image').style.display = 'none';
    }
    // ... rest of code
}
```

## Testing Plan

### Test 1: Sample Questions with Diagrams ✅
```bash
npm run generate:questions -- --test-mode --viewer
```
**Expected**: Geometry and Data questions show matplotlib-generated diagrams

### Test 2: Real Generator Diagrams ✅
```bash
# (Requires Azure)
npm run generate:questions -- --type Geometry --num-per-type 1 --viewer
```
**Expected**: AI-generated diagram displays correctly

### Test 3: Backwards Compatibility ✅
**Action**: Load old JSON files with `chartData.base64` format  
**Expected**: Viewer still displays images using fallback logic

## Priority

- **P0 (Critical)**: Fix 1 - Export function stores in wrong field
- **P1 (High)**: Fix 2 - Sample questions have no images
- **P2 (Medium)**: Fix 3 - Viewer defensive coding

## Implementation Order

1. Fix export function in sat_unified_generator_v4.py (5 min)
2. Add diagram generation to generate_sample_questions.py (10 min)
3. Update viewer with fallback logic (5 min)
4. Test all three scenarios (10 min)
5. Update documentation (5 min)

**Total Time**: ~35 minutes

## Success Criteria

✅ Geometry questions display right triangle diagram  
✅ Data questions display bar chart/data visualization  
✅ Reading questions with charts display correctly  
✅ Old JSON files still work (backwards compatible)  
✅ No console errors in browser  
✅ MathJax warnings ignorable (tracking prevention is expected)

## Notes

- MathJax tracking prevention warnings are browser security feature, not a bug
- Favicon 404 is cosmetic, can be fixed separately
- Focus on actual diagram display functionality first
