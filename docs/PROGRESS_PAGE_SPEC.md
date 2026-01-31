# Progress Page Specification

## Overview
The Progress page displays comprehensive analytics and performance tracking for users based on their completed practice tests. It provides insights into strengths, weaknesses, improvement trends, and detailed performance breakdowns.

## Current State Analysis

### Database Schema
**TestResult Model:**
- Stores overall test performance (score, time, SAT scores)
- Includes JSON fields for category/subtopic/difficulty performance
- Links to User and QuestionResult

**QuestionResult Model:**
- Individual question-level data (answer, correctness, time spent)
- Links to TestResult and Question

**Question Model:**
- Contains metadata: moduleType, difficulty, category, subtopic

### Existing API (`/api/progress`)
**Currently Returns:**
- `testsCompleted`: Count of completed tests
- `averageScore`: Average percentage score across all tests
- `timeSpent`: Total minutes spent on tests
- `strongAreas`: Top 3 categories with ≥75% accuracy (min 3 questions)
- `weakAreas`: Bottom 3 categories with <60% accuracy (min 3 questions)
- `recentScores`: Last 5 test scores
- `categoryPerformance`: Performance breakdown by category
- `modulePerformance`: Performance by module type (reading-writing vs math)
- `testHistory`: List of all completed tests with scores and dates

**Current Issues:**
1. API tries to access `questionResults.category` and `questionResults.moduleType` but these fields don't exist on QuestionResult
2. Need to join through the Question model to get this data
3. Missing actual SAT score display (only shows percentage)
4. No trend visualization or improvement tracking
5. Test history doesn't show actual module type

## Specification

### 1. Data Requirements

#### Primary Metrics
- **Tests Completed**: Total number of TestResults
- **Average Score**: Mean of all test scores (percentage)
- **Best Score**: Highest percentage score achieved
- **Total Study Time**: Sum of totalTimeSpent in minutes
- **Average SAT Score**: Mean of satTotalScore (400-1600 scale)
- **Best SAT Score**: Highest satTotalScore achieved
- **Latest SAT Score**: Most recent satTotalScore

#### Module-Level Performance
- **Reading & Writing Performance**:
  - Average score (%)
  - Average SAT Reading/Writing score (200-800)
  - Total questions answered
  - Correct answers
  - Average time per question
  
- **Math Performance**:
  - Average score (%)
  - Average SAT Math score (200-800)
  - Total questions answered
  - Correct answers
  - Average time per question

#### Category Performance
For each category (requires JOIN with Question model):
- Category name
- Total questions answered
- Correct answers
- Percentage correct
- Average time spent per question
- Strong areas: Categories with ≥75% accuracy (min 5 questions)
- Weak areas: Categories with <60% accuracy (min 5 questions)

#### Difficulty Performance
- Easy questions: accuracy %
- Medium questions: accuracy %
- Hard questions: accuracy %

#### Progress Trends
- Score progression over last 10 tests (line chart data)
- SAT score progression (line chart data)
- Study time by week/month
- Improvement rate (comparing first 3 vs last 3 tests)

#### Test History
Complete list with:
- Date/time completed
- Module focus (Math/Reading-Writing/Mixed)
- Percentage score
- SAT score breakdown (Reading, Math, Total)
- Time spent
- Questions attempted

### 2. API Endpoint Updates

**Endpoint:** `GET /api/progress`

**Response Structure:**
```typescript
{
  success: boolean
  data: {
    // Overview Stats
    overview: {
      testsCompleted: number
      averageScore: number              // percentage
      bestScore: number                 // percentage
      totalStudyTime: number            // minutes
      averageSATScore: number           // 400-1600
      bestSATScore: number              // 400-1600
      latestSATScore: number            // 400-1600
      improvementRate: number           // percentage change
    }
    
    // Module Performance
    modulePerformance: {
      readingWriting: {
        averageScore: number            // percentage
        averageSATScore: number         // 200-800
        totalQuestions: number
        correctAnswers: number
        averageTimePerQuestion: number  // seconds
      }
      math: {
        averageScore: number
        averageSATScore: number
        totalQuestions: number
        correctAnswers: number
        averageTimePerQuestion: number
      }
    }
    
    // Category Performance (top 10 by question count)
    categoryPerformance: Array<{
      category: string
      totalQuestions: number
      correctAnswers: number
      percentage: number
      averageTime: number               // seconds
      moduleType: string                // for filtering
    }>
    
    // Difficulty Performance
    difficultyPerformance: {
      easy: { correct: number, total: number, percentage: number }
      medium: { correct: number, total: number, percentage: number }
      hard: { correct: number, total: number, percentage: number }
    }
    
    // Strengths and Weaknesses
    strongAreas: string[]               // Top 3 categories ≥75%
    weakAreas: string[]                 // Bottom 3 categories <60%
    
    // Progress Trends
    scoreProgression: Array<{
      testNumber: number
      score: number                     // percentage
      satScore: number                  // SAT total
      date: string
    }>
    
    // Test History
    testHistory: Array<{
      id: string
      completedAt: string
      score: number                     // percentage
      satTotalScore: number
      satReadingScore: number
      satMathScore: number
      totalTimeSpent: number            // seconds
      totalQuestions: number
      correctAnswers: number
      moduleFocus: string               // determined by question distribution
    }>
  }
}
```

### 3. UI Components

#### Header Section
- Page title: "Your SAT Progress"
- Subtitle with user name/motivation

#### Overview Dashboard (4 stat cards)
1. **Tests Completed**: Large number with icon
2. **Average SAT Score**: With trend indicator (up/down from previous)
3. **Best SAT Score**: With badge/celebration
4. **Total Study Time**: Formatted as hours + minutes

#### Score Progress Chart
- Line chart showing last 10 tests
- Dual Y-axis: Percentage (left) and SAT Score (right)
- X-axis: Test number or date
- Different colors for percentage vs SAT score

#### Module Performance Cards (side by side)
**Reading & Writing Card:**
- Average SAT score (large, colored)
- Accuracy percentage
- Questions answered
- Average time per question
- Mini progress bar

**Math Card:**
- Same structure as Reading & Writing

#### Category Performance Section
- Grid of category cards (3-4 per row)
- Each card shows:
  - Category name
  - Accuracy percentage
  - Progress bar (color-coded: green ≥75%, yellow 60-74%, red <60%)
  - Question count
- Sort by accuracy (low to high) to highlight areas needing work

#### Difficulty Breakdown
- Three circular progress indicators or bars
- Easy / Medium / Hard
- Show percentage correct for each
- Color-coded

#### Strengths & Weaknesses (side by side)
**Strong Areas:**
- Green badge/cards
- List top 3-5 categories with ≥75% accuracy
- Show exact percentage

**Areas for Improvement:**
- Red/orange badge/cards
- List 3-5 categories with <60% accuracy
- "Focus here" call to action
- Link to practice those categories (future enhancement)

#### Test History Table
- Sortable columns: Date, Score %, SAT Score, Time
- Pagination if >10 tests
- Click row to see detailed test results (future)
- Export button (future)

#### Action Section
- Large CTA button: "Take Another Practice Test"
- Secondary actions: "Review Mistakes" (future), "Practice Weak Areas" (future)

### 4. Implementation Steps

1. **Fix API Data Fetching**
   - Add JOIN from QuestionResult → Question to get category, difficulty, moduleType
   - Calculate all required metrics
   - Implement proper data aggregation

2. **Update Progress Page UI**
   - Add SAT score displays
   - Implement score progression chart (use recharts or similar)
   - Add difficulty breakdown section
   - Improve module performance cards
   - Enhance category performance grid

3. **Add Loading & Error States**
   - Skeleton loaders for each section
   - Error boundary with retry
   - Empty state with encouraging message

4. **Polish & Optimization**
   - Add animations for stat counters
   - Smooth transitions
   - Responsive design for mobile
   - Optimize database queries with proper indexes

### 5. Future Enhancements
- Detailed test review (click on test history)
- Practice recommendations based on weak areas
- Goal setting (target SAT score)
- Achievement badges/milestones
- Comparison with national averages
- Study streak tracking
- Time-of-day performance analysis
- Export progress report as PDF

## Success Criteria
- Page loads within 2 seconds with all data
- All metrics accurately reflect database state
- Charts render properly on all screen sizes
- No errors when user has 0 tests completed
- Motivating and actionable insights for users
- SAT scores prominently displayed alongside percentages
