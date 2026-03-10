# SPEC: Bigger Diagrams & Cross-Module Distribution

## Problem
1. Diagrams are too small — images capped at `maxHeight: 400px`, SVG charts use fixed 300×200 / 300×300 / 400×350 sizes
2. All 7 diagram questions are in Math Module 2 (moduleIndex=3), Math Module 1 (moduleIndex=2) has zero — unbalanced experience

## Fix 1: Bigger Diagrams

### ChartRenderer.tsx Changes
- `<img>` tag: increase `maxHeight` from `400px` → `600px`
- ScatterPlot SVG: `300×300` → `500×400`
- BarChart SVG: `300×200` → `500×320`  
- GeometryDiagram SVG: `400×350` → `550×450`
- Add `viewBox` attribute to all SVGs for responsive scaling
- Use `className="w-full max-w-2xl"` on SVGs so they scale with container

## Fix 2: Spread Diagram Questions Across Modules

### Approach
Create a script that rebalances diagram-bearing questions across same-type modules for all published practice tests.

**Algorithm:**
1. Query all `PracticeTestQuestion` records with their questions
2. For each practice test, identify questions with `imageData IS NOT NULL` or `chartData IS NOT NULL`
3. For math modules (moduleIndex 2 and 3): if diagram questions are clustered in one module, redistribute evenly — swap diagram questions with non-diagram questions from the other module
4. Same for reading-writing modules (moduleIndex 0 and 1) if needed
5. Preserve `orderIndex` contiguity within each module

### Script: `scripts/rebalance-diagram-questions.ts`
- Reads all published practice tests
- For each test, gets questions per module with their image status
- Swaps assignments to achieve ~equal diagram distribution per module pair
- Updates `PracticeTestQuestion.moduleIndex` and `orderIndex` in a transaction

### Validation
- Each module retains correct question count (27/27/22/22)
- Each module retains correct moduleType (reading-writing/math)
- Diagram questions are approximately equal across same-type module pairs
