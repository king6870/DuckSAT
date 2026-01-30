# Diagram Generation Issue Specification

## Problem Statement
Question #9 (ReadingData/PassageDiagram type) has a diagram description but no actual image data, resulting in "No valid image source found" error.

## Root Cause Analysis

### Current Behavior
```
Console output for Question #9:
- hasImageData: false ❌
- hasChartData: true ✅
- chartData: {description: 'Line chart showing company revenue growth from 2015 to 2023'}
- Result: "No valid image source found"
```

### Code Investigation

#### File: `scripts/generate_sample_questions.py`

**Lines 209-214** - Diagram generation logic:
```python
# Generate sample diagrams for applicable types
diagram_base64 = None
if question_data.get('diagramDescription'):
    if question_type == 'Geometry':
        diagram_base64 = create_sample_diagram('right_triangle')
    elif question_type == 'Data':
        diagram_base64 = create_sample_diagram('data_chart')
```

**ISSUE**: Only handles 'Geometry' and 'Data' types, but NOT:
- 'PassageDiagram' (Reading question with diagram)
- 'ReadingData' (Reading question with data visualization)
- Any other question type that has a diagramDescription

#### Sample Question Definitions

**Lines 180-190** - PassageDiagram question:
```python
'PassageDiagram': {
    'question': 'Based on the data shown, in which year did sales first exceed 100 million dollars?',
    'passage': 'Our company has experienced steady growth over the past decade. Year-over-year revenue has increased consistently, with particular acceleration in recent years.',
    'choices': ['A) 2020', 'B) 2021', 'C) 2022', 'D) 2023'],
    'correctAnswer': 'C',
    'explanation': 'The chart indicates that sales surpassed the 100 million dollar mark in 2022.',
    'category': 'ReadingData',
    'difficulty': 'medium',
    'subtopic': 'reading-data',
    'diagramDescription': 'Line chart showing company revenue growth from 2015 to 2023'  # ✅ HAS DESCRIPTION
},
```

### Data Flow Analysis

```
Question Definition → export_question_to_json() → Check diagramDescription
                                ↓
                    if question_type in ['Geometry', 'Data']:
                        ✅ Generate matplotlib diagram
                    else:
                        ❌ No diagram generated (diagram_base64 = None)
                                ↓
                    Export with imageData = None
                                ↓
                    Viewer: "No valid image source found"
```

## Root Cause Summary

**The diagram generation logic is TOO RESTRICTIVE**. It only generates diagrams for specific math question types ('Geometry', 'Data'), but ignores reading questions that also have diagrams ('PassageDiagram', 'ReadingData').

The conditional check `if question_type == 'Geometry'` or `elif question_type == 'Data'` should instead check if a diagramDescription exists and generate an appropriate diagram based on the description content or question type category.

## Proposed Fix

### Option 1: Type-Based Routing (Recommended)
Add support for all question types that have diagram descriptions:

```python
# Generate sample diagrams for applicable types
diagram_base64 = None
if question_data.get('diagramDescription'):
    if question_type == 'Geometry':
        diagram_base64 = create_sample_diagram('right_triangle')
    elif question_type == 'Data':
        diagram_base64 = create_sample_diagram('data_chart')
    elif question_type in ['PassageDiagram', 'ReadingData']:
        # Reading questions with data visualizations
        diagram_base64 = create_sample_diagram('line_chart')
    else:
        # Fallback for any other type with diagram
        diagram_base64 = create_sample_diagram('data_chart')
```

### Option 2: Create New Diagram Type
Add a new `create_sample_diagram()` case for line charts:

```python
def create_sample_diagram(diagram_type: str) -> str:
    """Generate sample diagram as base64 PNG"""
    fig, ax = plt.subplots(figsize=(8, 6), facecolor='white')
    
    if diagram_type == 'right_triangle':
        # ... existing code ...
    elif diagram_type == 'data_chart':
        # ... existing code ...
    elif diagram_type == 'line_chart':
        # NEW: Line chart for revenue growth
        years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023]
        revenue = [45, 52, 61, 73, 82, 95, 98, 105, 118]  # In millions
        
        ax.plot(years, revenue, marker='o', linewidth=2, markersize=8, color='steelblue')
        ax.axhline(y=100, color='red', linestyle='--', linewidth=1, label='$100M threshold')
        ax.set_xlabel('Year', fontsize=12, fontweight='bold')
        ax.set_ylabel('Revenue ($ millions)', fontsize=12, fontweight='bold')
        ax.set_title('Company Revenue Growth (2015-2023)', fontsize=14, fontweight='bold')
        ax.grid(True, alpha=0.3)
        ax.legend()
        
        # Highlight 2022 (when it crossed 100M)
        ax.scatter([2022], [105], s=200, c='red', zorder=5)
    
    # ... rest of function ...
```

## Implementation Steps

1. **Add line_chart diagram type** to `create_sample_diagram()` function
2. **Update diagram generation logic** to handle ReadingData/PassageDiagram types
3. **Test with regenerated questions**
4. **Verify in browser** that Question #9 displays the line chart

## Expected Outcome

After fix:
- ✅ Question #2 (Geometry): Shows right triangle
- ✅ Question #5 (Data): Shows bar chart
- ✅ Question #9 (ReadingData): Shows line chart
- ✅ All questions with diagramDescription have actual imageData

## Testing Plan

1. **Regenerate questions**: `npx tsx scripts/generate-questions.ts --test-mode`
2. **Verify JSON**: Check that Question #9 has imageData with base64 PNG
3. **Open viewer**: Navigate to Question #9
4. **Check console**: Should show "Using imageData, length: XXXXX" and "Image loaded successfully!"
5. **Visual verification**: Line chart should be visible above the question

## Priority
**P0 - Critical**: User explicitly requested this be fixed, and it's a visible bug in the viewer.
