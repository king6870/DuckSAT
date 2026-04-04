# Practice Questions and Drills Full Spec

## 1. Summary
This spec defines a complete Practice experience that expands beyond full practice tests.

It adds:
- A top-level "Practice" page in primary navigation (next to About and Progress).
- Topic-based practice question drills for all SAT topics.
- Drill lengths of 1, 3, 5, 10, 20, and 30 questions.
- Instant feedback after each answer (correct/incorrect + explanation).
- Drill progress and performance integrated into the Progress page.

The implementation must match the existing site structure, styling system, and interaction patterns already used across DuckSAT.

## 2. Product Goals
- Let users quickly practice by topic without committing to full tests.
- Support short and long drill sessions (1-30 questions).
- Provide immediate learning feedback question-by-question.
- Track drill performance over time and surface it in Progress.
- Ensure full topic coverage across Reading/Writing and Math.

## 3. Non-Goals
- Replacing full-length practice tests.
- Rebuilding SAT scoring from scratch for drills (drills use accuracy/skill progress, not SAT composite scoring).
- Creating a new design language separate from the existing website.

## 4. User Stories
- As a student, I can click Practice from top navigation and start quickly.
- As a student, I can pick a topic and drill length (1/3/5/10/20/30).
- As a student, I receive instant feedback after each response.
- As a student, I can review why an answer is wrong.
- As a student, I can view drill history and improvement in Progress.
- As an admin/product owner, I can ensure every SAT topic has practice coverage.

## 5. Information Architecture

### 5.1 Navigation
Add a primary nav link:
- Label: Practice
- Placement: top navigation, adjacent to About and Progress
- Destination: /practice

### 5.2 Route Map
- /practice: practice home and topic selection
- /practice/[category]: topic drill flow
- Existing full tests remain under /practice-test and /practice-tests

### 5.3 Practice Home Sections
- Topic cards grouped by module:
  - Reading & Writing
  - Math
- Drill length selector: 1, 3, 5, 10, 20, 30
- Difficulty selector: Mixed, Easy, Medium, Hard
- CTA: Start Drill
- Recent practice summary (last score, streak, recent topics)

## 6. Topic Coverage Requirements
Use canonical SAT topic taxonomy (from existing topic data source).

Minimum coverage requirements:
- Every topic shown on /practice must be runnable.
- Each topic must have sufficient question inventory for all drill lengths.
- If a topic has insufficient questions:
  - Show clear message.
  - Fall back to closest subtopic/category only if explicitly enabled.
  - Never silently return unrelated questions.

Coverage health checks:
- Daily/CI report by topic: available question count by difficulty.
- Alert threshold for low inventory (for example < 40 active questions).

## 7. Drill UX Specification

### 7.1 Session Setup
User chooses:
- Topic
- Drill length: 1/3/5/10/20/30
- Difficulty filter: mixed/easy/medium/hard

### 7.2 Question Experience
For each question:
- Select one answer choice.
- Tap/click Check Answer.
- Show immediate result:
  - Correct: green success state
  - Incorrect: red state + correction guidance
- Show explanation (always).
- Show optional wrong-answer explanation (if available).
- Next Question action advances the flow.

### 7.3 End-of-Drill Screen
Display:
- Score (% and raw correct/total)
- Topic and difficulty used
- Per-question correctness markers
- Time spent
- CTA options:
  - Retry same config
  - New topic drill
  - Go to Progress

## 8. Data and Tracking Model

### 8.1 Entities
Use/extend existing drill result storage.

Required fields per drill session:
- id
- userId
- category/topic
- moduleType
- difficulty
- drillLength
- startedAt
- completedAt
- totalTimeMs
- totalQuestions
- correctAnswers
- scorePct

Required fields per question result:
- questionId
- questionIndex
- userAnswer
- correctAnswer
- isCorrect
- timeSpentMs
- category
- difficulty
- moduleType

### 8.2 Tracking Events
Emit events:
- drill_started
- drill_answer_checked
- drill_question_advanced
- drill_completed
- drill_abandoned

Event payload should include:
- topic/category
- difficulty
- drillLength
- correctness
- elapsed time

## 9. API Requirements

### 9.1 Fetch Drill Questions
Endpoint can use existing practice questions API if it supports these params:
- category/topic
- moduleType
- difficulty
- count (supports 1,3,5,10,20,30)
- includeExplanations=true

Response requirements:
- Stable shape
- Question options + correctAnswer + explanation
- Optional wrongAnswerExplanations and visual assets

### 9.2 Save Drill Results
Use existing drill-results endpoint or versioned replacement.

Must persist:
- Session-level stats
- Per-question stats
- Drill length

### 9.3 Progress Aggregates Endpoint
Progress page needs aggregate drill metrics by:
- Date range
- Module type
- Topic
- Difficulty

## 10. Progress Page Integration

### 10.1 New Drill Metrics
Add drill-specific cards/charts:
- Total drills completed
- Average drill score
- Accuracy trend over time
- Questions answered (drills only)
- Time spent in drills
- Topic mastery breakdown

### 10.2 Topic Mastery
For each topic:
- Attempts
- Accuracy
- Last practiced date
- Trend (up/down/flat)
- Confidence band if enough samples

### 10.3 Combined View with Practice Tests
Progress page should clearly separate:
- Practice Tests
- Topic Drills

And provide optional combined summary:
- Overall questions answered
- Overall accuracy trend

## 11. UI/Design Consistency Requirements
- Reuse existing component system and spacing scale.
- Reuse current gradient/background/rounded-card patterns in practice flows.
- Preserve keyboard navigation and accessibility patterns already used.
- Keep mobile behavior consistent with existing responsive breakpoints.

## 12. Accessibility Requirements
- Full keyboard support for answer selection and advance.
- Visible focus states on controls.
- ARIA labels for result states and controls.
- Color is not the only indicator (icons/text labels for correct/incorrect).

## 13. Performance Requirements
- Drill start response under target budget (for example p95 < 1.5s on cached/authenticated requests).
- Avoid loading unnecessary heavy assets on /practice home.
- Keep question transitions smooth.

## 14. Error Handling and Fallbacks
- No questions returned: show actionable empty state.
- API failure: show retry UI and preserve user context.
- Partial data (missing explanations): fallback message and continue flow.
- Save failure on completion: retry queue / best-effort banner.

## 15. Security and Integrity
- Validate user session for result submission.
- Validate drill length is allowed set: {1,3,5,10,20,30}.
- Validate difficulty and topic against allowed values.
- Never trust client-provided correctness; recompute server-side when needed.

## 16. Rollout Plan

### Phase 1: Core Drill Controls and Flow
- Add drill length selector (1/3/5/10/20/30)
- Validate all flows for existing /practice and /practice/[category]
- Ensure instant feedback UX is complete

### Phase 2: Topic Coverage Completion
- Verify all topic cards map to valid query params
- Fill any topic inventory gaps or enforce explicit fallback behavior

### Phase 3: Progress Integration
- Add drill metrics and topic mastery components to Progress
- Add time range filters and module/topic breakdowns

### Phase 4: Hardening
- Analytics verification
- Accessibility audit
- Mobile QA
- Error recovery QA

## 17. Acceptance Criteria

Functional:
- Practice is visible in top nav next to About and Progress.
- User can start drills for all supported topics.
- User can choose exactly 1, 3, 5, 10, 20, 30 questions.
- Each question gives immediate correct/incorrect feedback and explanation.
- Drill completion saves results successfully.
- Progress page shows drill data and trends.

Quality:
- Lint/build pass.
- No regression to full practice test flows.
- Mobile and desktop usability verified.

Data:
- Drill results appear in Progress within one refresh cycle.
- Aggregates by topic and difficulty are accurate.

## 18. QA Test Matrix
- Topic x difficulty x drill length matrix spot-checks.
- Instant feedback correctness against answer key.
- Persistence checks (session complete/abandon).
- Progress aggregation checks for single and repeated sessions.
- Authenticated and unauthenticated behavior checks.

## 19. Implementation Notes for Current Codebase
- Keep /practice and /practice/[category] as primary drill surfaces.
- Align topic taxonomy with existing SAT topic data source.
- Reuse existing tracking endpoints where possible to reduce migration risk.
- Ensure Progress page consumes drill aggregates without breaking existing test-result views.

## 20. Open Decisions
- Whether 30-question drills should allow optional timed mode.
- Whether to include adaptive difficulty in drills (future enhancement).
- Whether to expose per-subtopic drill mode in v1 or v2.

## 21. Deliverables
- Updated navigation with Practice top-level link placement finalized.
- Updated practice drill UX supporting 1/3/5/10/20/30.
- Back-end drill result persistence and progress aggregates.
- Updated Progress page with drill-specific analytics.
- QA signoff report confirming topic coverage and acceptance criteria.
