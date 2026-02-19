# PRD: Fixed SAT Practice Tests

**Epic**: #61  
**Status**: Draft  
**Author**: Product Manager Agent  
**Date**: 2026-02-19  
**Stakeholders**: Students, Teachers, Platform Administrators  
**Priority**: p1

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Target Users](#2-target-users)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Requirements](#4-requirements)
5. [User Stories & Features](#5-user-stories--features)
6. [User Flows](#6-user-flows)
7. [Dependencies & Constraints](#7-dependencies--constraints)
8. [Risks & Mitigations](#8-risks--mitigations)
9. [Timeline & Milestones](#9-timeline--milestones)
10. [Out of Scope](#10-out-of-scope)
11. [Open Questions](#11-open-questions)
12. [Appendix](#12-appendix)

---

## 1. Problem Statement

### What problem are we solving?
Students need standardized, repeatable SAT practice tests (like "SAT Practice Test 1" and "SAT Practice Test 2") with fixed question sets that remain consistent across multiple attempts. Currently, all tests use randomly selected questions, making it impossible for students to benchmark progress against official SAT practice test standards or retake specific tests for mastery.

### Why is this important?
**Official SAT practice tests** (published by College Board) use fixed question sets that students can retake to measure improvement. Our platform lacks this critical feature, forcing students to rely on external resources. Fixed practice tests enable:
- Consistent benchmarking (students can compare scores across attempts)
- Targeted review (retake specific weak tests)
- Realistic test simulation (matches official SAT format)
- Student confidence (familiarity with official test structure)

### What happens if we don't solve this?
- Students leave platform to use official College Board materials
- Inability to track true improvement (random tests mask progress)
- Competitive disadvantage vs. Khan Academy, College Board, and other SAT prep platforms
- Reduced student engagement (no sense of progression through specific tests)

---

## 2. Target Users

### Primary Users

**User Persona 1: SAT Test Taker (High School Junior/Senior)**
- **Demographics**: Age 16-18, US-based, tech-savvy, preparing 3-6 months before test
- **Goals**: Achieve target SAT score (1200-1600), track improvement, simulate real test conditions
- **Pain Points**: 
  - Can't compare scores across test attempts (random questions each time)
  - No way to retake "weak" tests to improve on specific content
  - Lack of official-style practice tests on platform
- **Behaviors**: 
  - Takes 1-2 full practice tests per week
  - Reviews incorrect answers immediately after tests
  - Retakes specific official tests (1-10) to master content

**User Persona 2: SAT Tutor/Teacher**
- **Demographics**: Age 25-65, tutoring students individually or in classroom
- **Goals**: Assign specific practice tests, track student progress across standardized tests
- **Pain Points**: 
  - Cannot assign "Practice Test 3" to all students (tests are random)
  - Difficult to compare student performance (different questions per attempt)
  - No consistent diagnostic tests
- **Behaviors**: 
  - Assigns specific practice tests as homework (e.g., "Everyone take Practice Test 4 by Friday")
  - Reviews class performance on specific test sections
  - Uses test retakes to measure mastery

### Secondary Users
- **Parents**: Monitor student progress through specific, named tests
- **Platform Administrators**: Need content management for fixed test creation and assignment

---

## 3. Goals & Success Metrics

### Business Goals
1. **Student Retention**: Increase weekly active users by 15% through fixed practice test engagement
2. **Competitive Parity**: Match Khan Academy's practice test library (10 fixed tests minimum)
3. **Platform Completeness**: Establish DuckSAT as a "complete" SAT prep platform

### Success Metrics (KPIs)
| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Practice test completion rate | 30% | 50% | 3 months |
| Test retake rate | 5% | 25% | 3 months |
| Student engagement (tests/week) | 0.8 | 1.5 | 3 months |
| Question pool utilization | 100% (all random) | 70% free-use, 30% reserved | Launch |

### User Success Criteria
- ✅ Student can select "SAT Practice Test 1" and get identical questions on retake
- ✅ Student scores are comparable across attempts (same test = same difficulty)
- ✅ Teacher can assign "Practice Test 3" to entire class
- ✅ Random/adaptive tests do NOT reuse questions from fixed practice tests
- ✅ Platform displays clear distinction between "Practice Tests" and "Random Tests"

---

## 4. Requirements

### 4.1 Functional Requirements (P0)

**FR-1: Fixed Practice Test Storage**
- System MUST store named practice tests (e.g., "SAT Practice Test 1", "Practice Test 2")
- Each test MUST have a fixed set of question IDs (54 math + 54 reading-writing = 98 total per test)
- Test configurations MUST include: name, description, difficulty level, question order

**FR-2: Question Reservation System**
- Questions assigned to fixed practice tests MUST be flagged as "reserved"
- Reserved questions MUST NOT appear in random/adaptive tests
- System MUST track which questions belong to which practice test(s)

**FR-3: Practice Test API**
- `GET /api/practice-tests` - List all available practice tests
- `GET /api/practice-tests/{id}` - Fetch specific practice test with questions (in fixed order)
- Questions MUST return in exact same order on every request for that test ID

**FR-4: Test Results Tracking**
- System MUST track attempts per practice test (e.g., "Practice Test 1 - Attempt 3")
- Results MUST show: score, SAT score, time, improvement from previous attempts
- Student dashboard MUST display progress across all attempts of each practice test

**FR-5: Random Test Exclusion Logic**
- `/api/questions/practice` (random test endpoint) MUST exclude reserved questions by default
- System MUST maintain minimum question pool size (≥400 unreserved questions) for random tests

### 4.2 Functional Requirements (P1)

**FR-6: Test Difficulty Designation**
- Each practice test MUST have difficulty rating: "Diagnostic", "Standard", "Advanced"
- UI MUST display difficulty to help students select appropriate tests

**FR-7: Test Creation Admin Interface**
- Admin panel to create new fixed practice tests
- Question picker UI with filters (category, difficulty, visual type)
- Preview test before publishing

### 4.3 Non-Functional Requirements

**NFR-1: Performance**
- Practice test fetch: <500ms (questions with explanations)
- Test list API: <200ms

**NFR-2: Data Integrity**
- Question order MUST be deterministic (same every time)
- Practice test configurations immutable after students begin taking them
- Database constraints prevent same question from appearing twice in one test

**NFR-3: Scalability**
- Support ≥20 fixed practice tests without performance degradation
- Question pool sizing: Reserve ≤30% of total questions for fixed tests (maintain ≥70% for random tests)

**NFR-4: Backward Compatibility**
- Existing random test functionality MUST NOT be affected
- Migration path for existing test results (no data loss)

---

## 5. User Stories & Features

### Epic Breakdown

**Feature 1: Practice Test Data Model & Storage**
- **Story 1.1**: Create PracticeTest database model (name, description, difficulty, isPublished, createdAt)
- **Story 1.2**: Create PracticeTestQuestion join table (practiceTestId, questionId, orderIndex)
- **Story 1.3**: Add `isReserved` boolean field to Question model
- **Story 1.4**: Migrate schema and deploy to production database

**Acceptance Criteria (Feature 1)**:
- [ ] PracticeTest table exists with required fields
- [ ] PracticeTestQuestion join table exists with unique constraint on (practiceTestId, orderIndex)
- [ ] Question.isReserved field defaults to `false`
- [ ] Schema migration script runs successfully on dev/staging/prod

---

**Feature 2: Practice Test Management API**
- **Story 2.1**: Create `GET /api/practice-tests` endpoint (list all published tests)
- **Story 2.2**: Create `GET /api/practice-tests/{id}` endpoint (fetch test with questions in order)
- **Story 2.3**: Add reserved question exclusion to existing `/api/questions/practice` endpoint
- **Story 2.4**: Create integration tests for all endpoints

**Acceptance Criteria (Feature 2)**:
- [ ] `GET /api/practice-tests` returns test metadata (no questions) in <200ms
- [ ] `GET /api/practice-tests/1` returns 98 questions in exact order, same every request
- [ ] Random test API excludes questions where `isReserved=true`
- [ ] Test coverage ≥80% for new endpoints

---

**Feature 3: Fixed Practice Test UI**
- **Story 3.1**: Create Practice Tests landing page (grid of available tests)
- **Story 3.2**: Update test-taking UI to support fixed test mode (disable question randomization)
- **Story 3.3**: Show "Attempt #X" in test header when retaking a practice test
- **Story 3.4**: Display previous attempt scores on practice test selection page

**Acceptance Criteria (Feature 3)**:
- [ ] Students can browse and select practice tests by name
- [ ] Fixed practice tests show consistent question order across attempts
- [ ] UI clearly distinguishes "Practice Tests" vs "Random Tests"
- [ ] Mobile-responsive design (test on iOS/Android)

---

**Feature 4: Test Attempt Tracking & Analytics**
- **Story 4.1**: Add `practiceTestId` field to TestResult model (nullable for backward compatibility)
- **Story 4.2**: Add `attemptNumber` field to TestResult (1-indexed per practiceTestId per user)
- **Story 4.3**: Create progress analytics API (`GET /api/practice-tests/{id}/progress`)
- **Story 4.4**: Build progress chart UI showing score improvement across attempts

**Acceptance Criteria (Feature 4)**:
- [ ] System auto-increments `attemptNumber` when user retakes a practice test
- [ ] Progress API returns: attempts, scores, SAT scores, improvement percentage
- [ ] Progress chart displays line graph of scores over time
- [ ] Student dashboard shows "best score" per practice test

---

**Feature 5: Practice Test Content Creation (Admin)**
- **Story 5.1**: Create admin-only endpoint `POST /api/admin/practice-tests` (create test)
- **Story 5.2**: Build admin UI for test creation (name, description, difficulty selector)
- **Story 5.3**: Build question picker UI with search/filter (category, difficulty, subtopic)
- **Story 5.4**: Implement question reservation workflow (mark questions as reserved on test publish)

**Acceptance Criteria (Feature 5)**:
- [ ] Admin can create practice test with 98 questions
- [ ] Question picker shows only unreserved questions
- [ ] Publishing test marks all questions as `isReserved=true`
- [ ] Preview mode shows test before publish

---

**Feature 6: Initial Test Seeding (Practice Tests 1 & 2)**
- **Story 6.1**: Create seeding script to build Practice Test 1 (balanced difficulty, all topics)
- **Story 6.2**: Create seeding script to build Practice Test 2 (balanced difficulty, all topics)
- **Story 6.3**: Run seeding scripts on production database
- **Story 6.4**: QA both tests end-to-end (take test, check questions, verify results)

**Acceptance Criteria (Feature 6)**:
- [ ] Practice Test 1 has 98 questions (54 math, 54 RW)
- [ ] Practice Test 2 has 98 questions (54 math, 54 RW)
- [ ] Both tests balanced across difficulties (30% easy, 50% medium, 20% hard)
- [ ] Both tests cover all SAT topics (algebra, geometry, reading comp, etc.)
- [ ] End-to-end QA passes (questions render correctly, scores calculate)

---

## 6. User Flows

### Flow 1: Student Selects and Takes Practice Test
```
1. Student logs in
2. Navigates to "Practice Tests" page
3. Sees grid of tests: "SAT Practice Test 1", "Practice Test 2", etc.
4. Clicks "Start Practice Test 1"
5. System checks: Has student taken this test before?
   - If YES: Show "Attempt #X" and previous scores
   - If NO: Show "First Attempt"
6. Student clicks "Begin Test"
7. System fetches fixed question set (98 questions in order)
8. Test begins (identical flow to current random tests)
9. Student completes test
10. Results saved with `practiceTestId=1` and `attemptNumber=X`
11. Results page shows: current score, SAT score, improvement from previous attempts
```

### Flow 2: Student Retakes Practice Test to Improve Score
```
1. Student navigates to "Practice Tests" page
2. Sees "Practice Test 1" with badge "Attempted 2 times | Best Score: 85%"
3. Clicks "Retake Test"
4. System shows: "Attempt #3" and score history chart
5. Student clicks "Start Test"
6. System fetches SAME 98 questions in SAME order
7. Student completes test
8. Results page shows: 
   - Current score vs. Attempt #1 and #2
   - Score improvement percentage
   - SAT score comparison
```

### Flow 3: Random Test Excludes Reserved Questions
```
1. Student clicks "Take Random Test"
2. System calls `/api/questions/practice?moduleType=math&count=27`
3. API applies filter: `WHERE isReserved = false`
4. API returns 27 random math questions (excluding Practice Test 1 & 2 questions)
5. Student takes test with unreserved questions only
```

### Flow 4: Admin Creates New Practice Test
```
1. Admin logs into admin panel
2. Navigates to "Practice Tests" → "Create New Test"
3. Fills form:
   - Name: "SAT Practice Test 3"
   - Description: "Standard difficulty full-length test"
   - Difficulty: "Standard"
4. Clicks "Select Questions"
5. Question picker loads (shows only unreserved questions)
6. Admin filters: Math, Algebra, Medium difficulty
7. Admin selects 15 algebra questions
8. Repeats for all categories until 98 questions selected
9. Admin reviews question order (drag-and-drop to reorder)
10. Admin clicks "Preview Test" (takes test in preview mode)
11. Admin clicks "Publish Test"
12. System marks all 98 questions as `isReserved=true`
13. Test appears on student Practice Tests page
```

---

## 7. Dependencies & Constraints

### Dependencies
- **Question Pool Size**: Requires ≥1,400 total questions to reserve 30% (420 questions for fixed tests) while maintaining ≥1,000 for random tests
  - Current pool: ~1,308 questions (from QG800 import)
  - Status: ✅ **Sufficient** (can reserve 400 questions, leaving 900+ for random tests)
  
- **Question Quality**: Fixed practice tests require high-quality, validated questions (cannot use low-rated or flagged questions)
  - Dependency: Question review/rating system (if exists)
  - Mitigation: Manual review during test creation

- **Database Migration**: Schema changes require downtime or zero-downtime migration strategy
  - Fields: `PracticeTest` table, `PracticeTestQuestion` table, `Question.isReserved`, `TestResult.practiceTestId/attemptNumber`

### Constraints
- **Immutability**: Once students begin taking a practice test, question set CANNOT change (would invalidate comparisons)
- **Question Distribution**: Each practice test MUST maintain SAT content distribution:
  - 54 math (27 per module): Algebra, Advanced Math, Problem Solving, Geometry
  - 54 reading-writing (27 per module): Reading Comprehension, Writing, Language
  - Difficulty: 30% easy, 50% medium, 20% hard
  
- **Performance**: Practice test fetches MUST load questions in <500ms (includes images/diagrams)
- **Backward Compatibility**: Existing test results MUST remain accessible (nullable `practiceTestId`)

### External Dependencies
- None (fully internal feature)

---

## 8. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Insufficient Questions**: Not enough high-quality questions to create multiple fixed tests + maintain random test pool | HIGH | LOW | ✅ Mitigated: Current pool (1,308) supports 4-5 fixed tests + random pool. Plan to generate more questions (QG800 Phase 2). |
| **Question Quality Issues**: Fixed tests contain errors, students lose trust | HIGH | MEDIUM | Implement review workflow: Admin preview → QA testing → Soft launch (beta users) → Full release |
| **Performance Degradation**: Loading 98 questions with images slow | MEDIUM | MEDIUM | Pre-cache practice tests, use CDN for images, optimize queries with `.include()` and proper indexes |
| **Student Confusion**: Students unsure when to use "Practice Tests" vs "Random Tests" | MEDIUM | HIGH | Clear UI copy, onboarding tooltips, FAQ section: "Practice Tests = Official-style, retakeable | Random Tests = Adaptive practice" |
| **Cheating Concerns**: Students share fixed test questions externally | LOW | HIGH | Acceptable risk (official SAT tests also publicly available). Monitor for question leaks. |
| **Admin Error**: Admin publishes test with wrong questions or duplicates | MEDIUM | MEDIUM | Validation rules: No duplicate questions, balanced distribution checker, mandatory preview step |

---

## 9. Timeline & Milestones

### Phase 1: Foundation (Weeks 1-2)
- **Week 1**: Feature 1 (Data Model & Migration)
- **Week 1-2**: Feature 2 (API Development)
- **Milestone**: APIs functional, database schema deployed to staging

### Phase 2: Core Features (Weeks 3-4)
- **Week 3**: Feature 3 (Fixed Test UI)
- **Week 4**: Feature 4 (Attempt Tracking & Analytics)
- **Milestone**: Students can take/retake fixed practice tests

### Phase 3: Content & Admin (Weeks 5-6)
- **Week 5**: Feature 5 (Admin Test Creation)
- **Week 6**: Feature 6 (Seed Practice Tests 1 & 2)
- **Milestone**: 2 official practice tests live on production

### Phase 4: QA & Launch (Week 7)
- **Week 7**: End-to-end testing, bug fixes, performance optimization
- **Launch Day**: Soft launch to beta users, monitor metrics
- **Week 8**: Full launch with marketing push

**Total Duration**: 7-8 weeks

---

## 10. Out of Scope

### Explicitly NOT Included
- ❌ **Paid Practice Tests**: All practice tests free (no premium tier)
- ❌ **Question Explanations Videos**: Text explanations only (video content is separate Epic)
- ❌ **Practice Test Scheduling**: No calendar integration or scheduled test reminders
- ❌ **Collaborative Features**: No group tests or shared results
- ❌ **Offline Mode**: Practice tests require internet connection
- ❌ **Third-Party Integrations**: No Canvas LMS, Google Classroom sync (future Epic)
- ❌ **Custom Test Creation (Students)**: Only admins can create practice tests
- ❌ **Practice Test Marketplace**: No community-generated tests

### Future Enhancements (Post-Launch)
- 📅 Create Practice Tests 3-10 (expand library to 10 tests)
- 📅 Adaptive difficulty recommendations ("Try Practice Test 4 next")
- 📅 Teacher dashboard for class-wide practice test analytics
- 📅 Practice test difficulty calibration based on student performance
- 📅 Question flagging/reporting for errors in fixed tests

---

## 11. Open Questions

### Technical Questions
1. **Q**: Should practice tests support mixed difficulty (e.g., "Diagnostic Test" with 50% easy questions)?  
   **A**: TBD - Consult with SAT content experts on official test distribution

2. **Q**: How to handle question updates? If a reserved question has an error, can we replace it?  
   **A**: TBD - Define "hotfix" workflow (replace question but notify students of change)

3. **Q**: Should we version practice tests (v1, v2) if questions change?  
   **A**: TBD - Likely YES to preserve historical comparisons

### Product Questions
4. **Q**: Should students see which questions came from which practice test in review mode?  
   **A**: TBD - Probably NO (avoid external sharing of test content)

5. **Q**: How many practice tests to launch with? 2, 5, or 10?  
   **A**: **DECISION: Launch with 2** (Practice Test 1 & 2), expand to 5 within 3 months

6. **Q**: Should we show percentile rankings for practice tests?  
   **A**: TBD - Requires large sample size (≥100 students per test)

---

## 12. Appendix

### A. Database Schema (Proposed)

**Model: PracticeTest**
```prisma
model PracticeTest {
  id          String   @id @default(cuid())
  name        String   @unique // "SAT Practice Test 1"
  description String?  // "Standard difficulty full-length test"
  difficulty  String   // "diagnostic" | "standard" | "advanced"
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  questions   PracticeTestQuestion[]
  testResults TestResult[]
  
  @@map("practice_tests")
}
```

**Model: PracticeTestQuestion**
```prisma
model PracticeTestQuestion {
  id             String   @id @default(cuid())
  practiceTestId String
  questionId     String
  orderIndex     Int      // 0-97 for question position
  
  practiceTest PracticeTest @relation(fields: [practiceTestId], references: [id], onDelete: Cascade)
  question     Question     @relation(fields: [questionId], references: [id])
  
  @@unique([practiceTestId, orderIndex])
  @@unique([practiceTestId, questionId]) // No duplicate questions per test
  @@index([practiceTestId])
  @@map("practice_test_questions")
}
```

**Model: Question (Additions)**
```prisma
model Question {
  // ... existing fields ...
  isReserved Boolean @default(false) // True if part of a fixed practice test
  
  // ... existing relations ...
  practiceTestQuestions PracticeTestQuestion[]
}
```

**Model: TestResult (Additions)**
```prisma
model TestResult {
  // ... existing fields ...
  practiceTestId String?  // Null for random tests
  attemptNumber  Int?     // 1, 2, 3, etc. for practice test retakes
  
  // ... existing relations ...
  practiceTest PracticeTest? @relation(fields: [practiceTestId], references: [id])
  
  @@index([userId, practiceTestId, attemptNumber])
}
```

### B. API Specification

**GET /api/practice-tests**
```json
Response 200:
{
  "success": true,
  "tests": [
    {
      "id": "clx123abc",
      "name": "SAT Practice Test 1",
      "description": "Standard difficulty full-length test",
      "difficulty": "standard",
      "questionCount": 98,
      "avgScore": 72,
      "attemptCount": 3 // User-specific
    }
  ]
}
```

**GET /api/practice-tests/{id}**
```json
Response 200:
{
  "success": true,
  "test": {
    "id": "clx123abc",
    "name": "SAT Practice Test 1",
    "difficulty": "standard",
    "questions": [
      {
        "id": "q1",
        "question": "Solve for x: 2x + 5 = 15",
        "options": ["A) 5", "B) 10", "C) 7.5", "D) 2.5"],
        "correctAnswer": 0,
        "moduleType": "math",
        "category": "algebra"
      }
      // ... 97 more questions
    ]
  }
}
```

**GET /api/practice-tests/{id}/progress** (User-specific)
```json
Response 200:
{
  "success": true,
  "progress": {
    "practiceTestId": "clx123abc",
    "attempts": [
      {
        "attemptNumber": 1,
        "score": 65,
        "satScore": 1150,
        "completedAt": "2026-02-15T10:30:00Z"
      },
      {
        "attemptNumber": 2,
        "score": 72,
        "satScore": 1220,
        "completedAt": "2026-02-18T14:00:00Z"
      }
    ],
    "improvement": 10.8, // Percentage improvement
    "bestScore": 72
  }
}
```

### C. Question Distribution (Full-Length SAT Practice Test)

| Module | Category | Questions | Difficulty Mix |
|--------|----------|-----------|----------------|
| **Math Module 1** | Algebra | 9 | 3 easy, 5 med, 1 hard |
| | Advanced Math | 6 | 2 easy, 3 med, 1 hard |
| | Problem Solving | 7 | 2 easy, 4 med, 1 hard |
| | Geometry | 5 | 2 easy, 2 med, 1 hard |
| **Math Module 2** | (Same as Module 1) | 27 | 9 easy, 14 med, 4 hard |
| **Reading/Writing Mod 1** | Reading Comp | 15 | 5 easy, 8 med, 2 hard |
| | Writing/Language | 12 | 3 easy, 7 med, 2 hard |
| **Reading/Writing Mod 2** | (Same as Module 1) | 27 | 8 easy, 15 med, 4 hard |
| **TOTAL** | | **98** | **30 easy, 49 med, 19 hard** |

### D. Competitive Analysis

| Platform | Fixed Practice Tests | Retake Functionality | Question Pool Size |
|----------|---------------------|----------------------|-------------------|
| **Khan Academy** | ✅ 8 official tests | ✅ Unlimited retakes | ~1,000 questions |
| **College Board** | ✅ 10 official tests | ✅ Unlimited retakes | ~1,000 questions |
| **PrepScholar** | ✅ 10+ tests | ✅ Retakes + analytics | ~1,500 questions |
| **DuckSAT (Current)** | ❌ None | ❌ N/A (random only) | ~1,308 questions |
| **DuckSAT (After Epic)** | ✅ 2 tests (launch) | ✅ Retakes + analytics | ~1,308 questions |

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-19  
**Status**: Ready for Review
