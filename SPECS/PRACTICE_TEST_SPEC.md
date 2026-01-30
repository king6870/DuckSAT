# Practice Test Page Restoration Specification

## Objective
Restore the practice test page to its original comprehensive design with 2 modules, time limits, and proper section management.

## Requirements

### Overall Structure
- **2 Modules**: Module 1 and Module 2
- **2 Sections per Module**: Reading & Writing + Math
- **Question Distribution**:
  - Reading & Writing: 32 questions
  - Math: 27 questions
  - Per Module: ~30 questions each (split across sections)

### Module 1 Design
- Time Limit: ~65 minutes (combined sections)
  - Reading & Writing: ~35 minutes (22 questions)
  - Math: ~30 minutes (20 questions)
- Sections presented in order
- Can move between questions within module
- Cannot go back to previous module

### Module 2 Design
- Adaptive based on Module 1 performance
- Time Limit: ~65 minutes (combined sections)
  - Reading & Writing: ~35 minutes (10 questions)
  - Math: ~27 minutes (7 questions)
- Similar navigation to Module 1

### Features Required

#### Test Launcher
- Button to start test
- Display test information
- Link to instructions

#### Navigation
- Question number display (e.g., "Question 15 of 52")
- Progress indicator (bar or percentage)
- Previous/Next buttons
- Section indicator
- Time remaining display

#### Question Display
- Question text
- Passage (if applicable)
- Diagram/Chart (if applicable)
- Multiple choice options (A, B, C, D)
- Visual indication of selected answer
- Visual indication of answered vs unanswered

#### Answer Management
- Store selected answers per question
- Allow changing answers
- Review mode to see all answers before submitting

#### Time Management
- Timer for each section (or overall)
- Warning when time is running out
- Auto-submit when time expires

#### Results/Analytics
- Score display
- Breakdown by section
- Performance analytics
- Comparison to previous attempts

## Data Flow

```
Start Test → Module 1 Start Screen
  → Reading & Writing Section (22 questions)
    → Math Section (20 questions)
  → Module 1 Complete
→ Module 2 Start Screen (adaptive)
  → Reading & Writing Section (10 questions)
    → Math Section (7 questions)
  → Module 2 Complete
→ Results Page
  → Analytics
```

## Implementation Strategy

1. **Fetch questions** from database with proper section categorization
2. **Calculate time allocation** based on question count and section
3. **Manage state** for:
   - Current module (1 or 2)
   - Current section (Reading or Math)
   - Current question index
   - Selected answers
   - Time remaining
   - Module completion status
4. **Handle navigation** with validation (can't go back to Module 1 once Module 2 starts)
5. **Render components**:
   - TestLauncher (initial screen)
   - ModuleStart (before each module)
   - QuestionDisplay (current question)
   - SectionProgress (section overview)
   - TimeDisplay (countdown timer)
   - ResultsPage (final scores)

## Key Differences from Current Code
- Current: Single test mode, all questions at once
- Required: 2 separate modules with different question counts
- Current: No time management
- Required: Per-section time limits with countdown
- Current: Simple question navigation
- Required: Section-based navigation with module boundaries
- Current: No results/analytics
- Required: Full results page with performance breakdown

## Success Criteria
✅ Test starts with Module 1
✅ Reading & Writing section has 22 questions
✅ Math section has 20 questions
✅ Module 1 time limit enforced
✅ Can't go back to Module 1 after starting Module 2
✅ Module 2 has 17 questions total (adaptive)
✅ Timer displays and counts down
✅ Answers are saved and can be reviewed
✅ Results show score breakdown by section
✅ Progress bar updates correctly throughout test
