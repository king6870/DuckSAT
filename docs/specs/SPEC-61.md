# Technical Specification: Fixed SAT Practice Tests

**Issue**: #62, #63, #65, #66, #67, #68  
**Epic**: #61  
**Status**: Draft  
**Author**: Solution Architect Agent  
**Date**: 2026-02-19  
**Related ADR**: [ADR-61.md](../adr/ADR-61.md)

> **Acceptance Criteria**: Defined in the PRD user stories — see [PRD-FIXED-PRACTICE-TESTS.md](../prd/PRD-FIXED-PRACTICE-TESTS.md#5-user-stories--features). Engineers should track AC completion against the originating Story issue.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Diagrams](#2-architecture-diagrams)
3. [API Design](#3-api-design)
4. [Data Model Diagrams](#4-data-model-diagrams)
5. [Service Layer Diagrams](#5-service-layer-diagrams)
6. [Security Diagrams](#6-security-diagrams)
7. [Performance](#7-performance)
8. [Testing Strategy](#8-testing-strategy)
9. [Implementation Notes](#9-implementation-notes)
10. [Rollout Plan](#10-rollout-plan)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Monitoring & Observability](#12-monitoring--observability)

---

## 1. Overview

This spec defines the technical implementation for named, fixed-content SAT practice tests. The system introduces a `PracticeTest` entity with a join table `PracticeTestQuestion` that maps questions to tests with deterministic module assignment and ordering. The existing random test flow is updated to exclude reserved questions, and the `useTestState` hook gains a dual-mode capability (random vs. fixed).

**Scope:**
- In scope: Database migration, REST APIs, UI integration, attempt tracking, seeding scripts, admin endpoints
- Out of scope: Paid tiers, video explanations, offline mode, teacher dashboards

**Success Criteria:**
- Practice Test 1 returns identical 98 questions in identical order across all requests
- Random test API returns zero reserved questions
- Attempt tracking shows correct attempt number and score history per practice test per user
- All APIs respond within specified latency targets (200ms list, 500ms questions)

---

## 2. Architecture Diagrams

### 2.1 High-Level Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js App (Client)                   │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │  /practice-tests │    │  /practice-test              │   │
│  │  (Selection Page) │──>│  (Test-Taking Page)           │   │
│  │  PracticeTestGrid │   │  useTestState(practiceTestId) │   │
│  └──────────────────┘    └──────────────────────────────┘   │
│           │                         │                        │
└───────────┼─────────────────────────┼────────────────────────┘
            │                         │
            ▼                         ▼
┌───────────────────────┐  ┌─────────────────────────────────┐
│ GET /api/practice-tests│  │ GET /api/practice-tests/{id}    │
│ (List + user attempts) │  │ (Questions ordered by module)   │
└───────────┬───────────┘  └────────────┬────────────────────┘
            │                           │
            ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Prisma ORM Layer                        │
│                                                             │
│  PracticeTest ──< PracticeTestQuestion >── Question         │
│       │                                                     │
│       └──< TestResult (practiceTestId, attemptNumber)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│    Azure SQL Server     │
│  practice_tests         │
│  practice_test_questions│
│  questions (isReserved) │
│  test_results (+2 cols) │
└─────────────────────────┘
```

### 2.2 Question Flow: Fixed vs. Random

```
                    Student Action
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
    "Take Practice Test 1"    "Take Random Test"
            │                         │
            ▼                         ▼
   GET /api/practice-tests/   GET /api/questions
   {id}?module=0              ?moduleType=math
            │                 &limit=22
            │                         │
            ▼                         ▼
   SELECT q.* FROM            SELECT q.* FROM
   practice_test_questions    questions q
   ptq JOIN questions q       WHERE q.isActive = true
   ON ptq.questionId = q.id   AND q.isReserved = false
   WHERE ptq.practiceTestId   AND q.moduleType = 'math'
   = {id}                     ORDER BY NEWID()
   AND ptq.moduleIndex = 0    LIMIT 22
   ORDER BY ptq.orderIndex
            │                         │
            ▼                         ▼
   Deterministic [q1,q2,...q27]  Random [q?,q?,...]
   Same every time                Different every time
```

### 2.3 Test Attempt Lifecycle

```
   Student selects Practice Test 1
                │
                ▼
   Check previous attempts
   (TestResult WHERE userId + practiceTestId)
                │
                ▼
   Display: "Attempt #3 | Best Score: 85%"
                │
                ▼
   Fetch questions: GET /api/practice-tests/{id}
   Response split by moduleIndex: [0..3]
                │
                ▼
   Module 0: RW-1 (27q, 32min)
   Module 1: RW-2 (27q, 32min)
        [10-min break]
   Module 2: Math-1 (22q, 35min)
   Module 3: Math-2 (22q, 35min)
                │
                ▼
   POST /api/test-results
   Body includes practiceTestId + attemptNumber=3
                │
                ▼
   Results page: Score vs. Attempt 1, 2
   Improvement chart
```

---

## 3. API Design

### 3.1 GET /api/practice-tests

**Purpose:** List all published practice tests with user-specific attempt data.

**Authentication:** Required (NextAuth session)

**Query Parameters:** None

**Response 200:**
```
{
  "success": true,
  "tests": [
    {
      "id": "clx...",
      "name": "SAT Practice Test 1",
      "description": "Standard difficulty full-length practice test",
      "difficulty": "standard",
      "questionCount": 98,
      "isPublished": true,
      "userAttempts": 2,
      "bestScore": 85,
      "bestSatScore": 1350,
      "lastAttemptAt": "2026-02-18T14:00:00Z"
    }
  ]
}
```

**Implementation Notes:**
- Aggregate user attempts via `TestResult.count({ where: { userId, practiceTestId } })`
- Best score via `TestResult.aggregate({ _max: { score: true } })`
- Only return tests where `isPublished = true`
- Unauthenticated users: return tests without `userAttempts`/`bestScore` fields

---

### 3.2 GET /api/practice-tests/{id}

**Purpose:** Fetch a practice test with all questions in module-ordered sequence.

**Authentication:** Required

**Query Parameters:**
- `module` (optional): 0–3. If provided, return questions for that module only.

**Response 200:**
```
{
  "success": true,
  "test": {
    "id": "clx...",
    "name": "SAT Practice Test 1",
    "difficulty": "standard",
    "attemptNumber": 3,
    "modules": [
      {
        "moduleIndex": 0,
        "moduleType": "reading-writing",
        "title": "Reading and Writing - Module 1",
        "duration": 32,
        "questions": [
          {
            "id": "q1",
            "question": "...",
            "passage": "...",
            "options": ["A)...", "B)...", "C)...", "D)..."],
            "correctAnswer": 0,
            "explanation": "...",
            "moduleType": "reading-writing",
            "category": "reading-comprehension",
            "difficulty": "medium",
            "imageData": null,
            "chartData": null,
            "timeEstimate": 90
          }
        ]
      }
    ]
  }
}
```

**Implementation Notes:**
- `attemptNumber` = count of existing `TestResult` rows for this user + test + 1
- Questions fetched via `PracticeTestQuestion` join with `ORDER BY moduleIndex, orderIndex`
- Group results by `moduleIndex` into 4 arrays matching `MODULE_CONFIGS`
- Parse JSON fields (`options`, `tags`, `chartData`, `wrongAnswerExplanations`)
- Convert `imageData` (Bytes) to base64 string

---

### 3.3 GET /api/practice-tests/{id}/progress

**Purpose:** Return user's attempt history for a specific practice test.

**Authentication:** Required

**Response 200:**
```
{
  "success": true,
  "progress": {
    "practiceTestId": "clx...",
    "practiceTestName": "SAT Practice Test 1",
    "totalAttempts": 3,
    "bestScore": 85,
    "bestSatScore": 1350,
    "improvement": 15.4,
    "attempts": [
      {
        "attemptNumber": 1,
        "score": 65,
        "satTotalScore": 1100,
        "satReadingScore": 520,
        "satMathScore": 580,
        "totalTimeSpent": 7200,
        "completedAt": "2026-02-10T10:00:00Z",
        "categoryPerformance": { ... }
      },
      {
        "attemptNumber": 2,
        "score": 78,
        "satTotalScore": 1250,
        "completedAt": "2026-02-15T14:00:00Z"
      }
    ]
  }
}
```

**Implementation Notes:**
- Query `TestResult WHERE userId AND practiceTestId ORDER BY attemptNumber ASC`
- `improvement` = ((latest score - first score) / first score) * 100

---

### 3.4 POST /api/admin/practice-tests

**Purpose:** Create a new practice test (admin only).

**Authentication:** Required + Admin role check

**Request Body:**
```
{
  "name": "SAT Practice Test 3",
  "description": "Advanced difficulty full-length test",
  "difficulty": "advanced",
  "modules": [
    {
      "moduleIndex": 0,
      "moduleType": "reading-writing",
      "questionIds": ["q1", "q2", ..., "q27"]
    },
    {
      "moduleIndex": 1,
      "moduleType": "reading-writing",
      "questionIds": ["q28", "q29", ..., "q54"]
    },
    {
      "moduleIndex": 2,
      "moduleType": "math",
      "questionIds": ["q55", "q56", ..., "q76"]
    },
    {
      "moduleIndex": 3,
      "moduleType": "math",
      "questionIds": ["q77", "q78", ..., "q98"]
    }
  ]
}
```

**Validation Rules:**
- `name` must be unique
- Module 0 and 1: exactly 27 questions each, all `moduleType = 'reading-writing'`
- Module 2 and 3: exactly 22 questions each, all `moduleType = 'math'`
- Total: exactly 98 questions
- No question IDs that are already `isReserved = true`
- No duplicate question IDs within the test
- All question IDs must exist and be `isActive = true`

**Response 201:**
```
{
  "success": true,
  "practiceTest": { "id": "clx...", "name": "SAT Practice Test 3" }
}
```

---

### 3.5 PUT /api/admin/practice-tests/{id}/publish

**Purpose:** Publish a draft practice test (marks questions as reserved).

**Authentication:** Required + Admin role

**Side Effects:**
1. Set `PracticeTest.isPublished = true`
2. Set `Question.isReserved = true` for all 98 linked questions
3. Both operations in a single Prisma transaction

**Response 200:**
```
{
  "success": true,
  "published": true,
  "reservedQuestionCount": 98
}
```

---

### 3.6 Modified: GET /api/questions/practice (Random Test)

**Change:** Add `isReserved: false` to the existing Prisma `where` clause.

**Current code** (line ~119 of `route.ts`):
```typescript
const where: Prisma.QuestionWhereInput = {
  isActive: true,
  moduleType: query.moduleType
};
```

**Updated code:**
```typescript
const where: Prisma.QuestionWhereInput = {
  isActive: true,
  isReserved: false,   // Exclude practice test questions
  moduleType: query.moduleType
};
```

This is a single-line change that excludes all reserved questions from random tests.

---

### 3.7 Modified: POST /api/test-results

**Change:** Accept optional `practiceTestId` and auto-calculate `attemptNumber`.

**Updated request body (additions):**
```
{
  "testResults": { ... },
  "practiceTestId": "clx..." | null
}
```

**Server logic:**
```
IF practiceTestId is provided:
  attemptNumber = COUNT(TestResult WHERE userId AND practiceTestId) + 1
  Store both fields on new TestResult row
ELSE:
  practiceTestId = null, attemptNumber = null (random test)
```

---

## 4. Data Model Diagrams

### 4.1 Entity Relationship Diagram

```
┌─────────────────────┐       ┌────────────────────────────┐
│    PracticeTest      │       │     PracticeTestQuestion    │
├─────────────────────┤       ├────────────────────────────┤
│ id          (PK)    │──┐    │ id             (PK)        │
│ name        (UQ)    │  │    │ practiceTestId (FK)        │
│ description         │  ├───>│ questionId     (FK)        │
│ difficulty          │  │    │ moduleIndex    (0-3)       │
│ isPublished         │  │    │ orderIndex     (0-97)      │
│ createdAt           │  │    ├────────────────────────────┤
│ updatedAt           │  │    │ UQ(practiceTestId,orderIdx)│
└─────────────────────┘  │    │ UQ(practiceTestId,questId) │
         │               │    └──────────┬─────────────────┘
         │               │               │
         ▼               │               ▼
┌─────────────────────┐  │    ┌────────────────────────────┐
│    TestResult        │  │    │        Question             │
├─────────────────────┤  │    ├────────────────────────────┤
│ id          (PK)    │  │    │ id             (PK)        │
│ userId      (FK)    │  │    │ moduleType                 │
│ practiceTestId (FK) │<─┘    │ difficulty                 │
│ attemptNumber       │       │ category                   │
│ score               │       │ question         @db.Text  │
│ satTotalScore       │       │ options          @db.Text  │
│ ... existing fields │       │ correctAnswer              │
└─────────────────────┘       │ isReserved (NEW, default F)│
                              │ ... existing fields        │
                              └────────────────────────────┘
```

### 4.2 Prisma Schema Additions

**New model: PracticeTest**
```prisma
model PracticeTest {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?  @db.Text
  difficulty  String   // "diagnostic" | "standard" | "advanced"
  isPublished Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  questions   PracticeTestQuestion[]
  testResults TestResult[]

  @@map("practice_tests")
}
```

**New model: PracticeTestQuestion**
```prisma
model PracticeTestQuestion {
  id             String @id @default(cuid())
  practiceTestId String
  questionId     String
  moduleIndex    Int    // 0=RW-1, 1=RW-2, 2=Math-1, 3=Math-2
  orderIndex     Int    // 0-97 global ordering within the test

  practiceTest PracticeTest @relation(fields: [practiceTestId], references: [id], onDelete: Cascade)
  question     Question     @relation(fields: [questionId], references: [id])

  @@unique([practiceTestId, orderIndex])
  @@unique([practiceTestId, questionId])
  @@index([practiceTestId, moduleIndex])
  @@map("practice_test_questions")
}
```

**Modified model: Question (additions)**
```prisma
// ADD to existing Question model:
  isReserved  Boolean @default(false)
  practiceTestQuestions PracticeTestQuestion[]

// ADD index for reservation filtering:
  @@index([isActive, isReserved, moduleType])
```

**Modified model: TestResult (additions)**
```prisma
// ADD to existing TestResult model:
  practiceTestId String?
  attemptNumber  Int?

  practiceTest PracticeTest? @relation(fields: [practiceTestId], references: [id])

// ADD index for attempt queries:
  @@index([userId, practiceTestId])
```

### 4.3 Migration Strategy

**Migration type:** Additive only — no column drops, no type changes.

**Steps:**
1. `npx prisma migrate dev --name add-practice-tests` — creates new tables
2. All new columns have defaults (`isReserved = false`) or are nullable (`practiceTestId`, `attemptNumber`) — zero data backfill needed
3. Deploy during low-traffic window (no data transformation, should take <10 seconds)
4. Verify with `SELECT COUNT(*) FROM practice_tests` and `SELECT COUNT(*) FROM questions WHERE isReserved = 1`

---

## 5. Service Layer Diagrams

### 5.1 Practice Test Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Service Layer                          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │            PracticeTestService                   │    │
│  ├─────────────────────────────────────────────────┤    │
│  │ listPublishedTests(userId?)                     │    │
│  │ getTestWithQuestions(testId, userId)             │    │
│  │ getTestProgress(testId, userId)                  │    │
│  │ createTest(name, desc, difficulty, modules[])    │    │
│  │ publishTest(testId)                              │    │
│  │ validateTestComposition(modules[])               │    │
│  │ getNextAttemptNumber(testId, userId)              │    │
│  └──────────────────┬──────────────────────────────┘    │
│                     │                                    │
│  ┌──────────────────▼──────────────────────────────┐    │
│  │          QuestionReservationService              │    │
│  ├─────────────────────────────────────────────────┤    │
│  │ reserveQuestions(questionIds[])                  │    │
│  │ unreserveQuestions(questionIds[])                │    │
│  │ getReservedCount()                               │    │
│  │ getAvailablePoolSize(moduleType)                 │    │
│  │ validatePoolThreshold(newReservationCount)       │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
                    Prisma ORM → SQL Server
```

### 5.2 File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── practice-tests/
│   │   │   ├── route.ts              # GET /api/practice-tests (list)
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET /api/practice-tests/{id}
│   │   │       └── progress/
│   │   │           └── route.ts      # GET /api/practice-tests/{id}/progress
│   │   ├── admin/
│   │   │   └── practice-tests/
│   │   │       ├── route.ts          # POST /api/admin/practice-tests
│   │   │       └── [id]/
│   │   │           └── publish/
│   │   │               └── route.ts  # PUT /api/admin/practice-tests/{id}/publish
│   │   ├── questions/
│   │   │   └── practice/
│   │   │       └── route.ts          # MODIFIED: add isReserved filter
│   │   └── test-results/
│   │       └── route.ts              # MODIFIED: accept practiceTestId
│   ├── practice-tests/
│   │   └── page.tsx                  # NEW: Practice test selection page
│   └── practice-test/
│       └── page.tsx                  # MODIFIED: accept practiceTestId param
├── hooks/
│   └── useTestState.ts               # MODIFIED: dual-mode (random vs fixed)
├── types/
│   └── test.ts                       # MODIFIED: add PracticeTest types
├── components/
│   └── test/
│       ├── PracticeTestGrid.tsx       # NEW: test selection grid
│       ├── AttemptBadge.tsx           # NEW: attempt count + best score badge
│       └── ProgressChart.tsx          # NEW: score improvement line chart
├── lib/
│   └── services/
│       ├── practiceTestService.ts     # NEW: business logic
│       └── questionReservation.ts     # NEW: reservation logic
scripts/
├── seed-practice-tests.ts             # NEW: seed PT1 and PT2
```

### 5.3 useTestState Hook Modification

```
useTestState(userId, practiceTestId?)
    │
    ├── IF practiceTestId is provided:
    │   │
    │   ├── fetchQuestions() calls:
    │   │   GET /api/practice-tests/{practiceTestId}?module={moduleIndex}
    │   │
    │   ├── Questions arrive pre-ordered (no shuffling)
    │   │
    │   └── completeTest() includes practiceTestId in POST /api/test-results
    │
    └── ELSE (random test, existing behavior):
        │
        ├── fetchQuestions() calls:
        │   GET /api/questions?moduleType={type}&limit={count}
        │
        ├── Questions are randomly selected (existing logic)
        │
        └── completeTest() sends practiceTestId=null
```

**Key changes to `useTestState`:**
1. Add `practiceTestId` optional parameter
2. `fetchQuestions` branches: if `practiceTestId`, fetch from `/api/practice-tests/{id}?module={n}` instead of `/api/questions`
3. In fixed mode, skip the `usedQuestionIds` tracking (questions are deterministic)
4. `completeTest` passes `practiceTestId` to `/api/test-results`
5. Add `attemptNumber` to result display

---

## 6. Security Diagrams

### 6.1 Authorization Model

```
┌────────────────────────────────────────────────────────┐
│                  Authorization Matrix                  │
├──────────────────────┬─────────┬───────────┬──────────┤
│ Endpoint             │ Student │ Admin     │ Anon     │
├──────────────────────┼─────────┼───────────┼──────────┤
│ GET /practice-tests  │ ✅ list │ ✅ list   │ ✅ list* │
│ GET /practice-tests/ │ ✅ read │ ✅ read   │ ❌       │
│   {id}               │         │           │          │
│ GET /practice-tests/ │ ✅ own  │ ✅ any    │ ❌       │
│   {id}/progress      │ data    │ user      │          │
│ POST /admin/         │ ❌      │ ✅ create │ ❌       │
│   practice-tests     │         │           │          │
│ PUT /admin/.../      │ ❌      │ ✅ publish│ ❌       │
│   publish            │         │           │          │
├──────────────────────┴─────────┴───────────┴──────────┤
│ * Anonymous users see test list without attempt data   │
└────────────────────────────────────────────────────────┘
```

### 6.2 Security Checklist

- **No hardcoded secrets**: Admin role check via session, not hardcoded tokens
- **Input validation**: Zod schemas on all endpoints (question IDs, module indices, counts)
- **SQL injection**: Prisma parameterized queries (no raw SQL)
- **Authorization**: Admin endpoints check `session.user.role === 'admin'` or equivalent
- **Rate limiting**: Practice test fetch limited to 10 req/min per user (prevent scraping)
- **Data isolation**: Progress endpoint returns only own data (WHERE userId = session.userId)

---

## 7. Performance

### 7.1 Query Optimization

**Practice test list (target: <200ms):**
```
-- Single query with aggregation
SELECT pt.*, 
  COUNT(tr.id) as attemptCount,
  MAX(tr.score) as bestScore,
  MAX(tr.satTotalScore) as bestSatScore
FROM practice_tests pt
LEFT JOIN test_results tr ON tr.practiceTestId = pt.id AND tr.userId = @userId
WHERE pt.isPublished = true
GROUP BY pt.id
```

**Practice test questions (target: <500ms):**
```
-- JOIN with ORDER BY on indexed columns
SELECT q.*, ptq.moduleIndex, ptq.orderIndex
FROM practice_test_questions ptq
JOIN questions q ON q.id = ptq.questionId
WHERE ptq.practiceTestId = @testId
ORDER BY ptq.moduleIndex, ptq.orderIndex
```

### 7.2 Index Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| `practice_test_questions` | `(practiceTestId, moduleIndex)` | Module-specific question fetch |
| `practice_test_questions` | `(practiceTestId, orderIndex)` UNIQUE | Deterministic ordering |
| `practice_test_questions` | `(practiceTestId, questionId)` UNIQUE | Prevent duplicate questions |
| `questions` | `(isActive, isReserved, moduleType)` | Random test exclusion filter |
| `test_results` | `(userId, practiceTestId)` | Attempt count + progress queries |

### 7.3 Caching Strategy

- **Test list**: Cache for 5 minutes (user-specific attempt data refreshed on page visit)
- **Test questions**: Cache indefinitely per testId (questions never change once published)
- **Implementation**: Next.js `revalidate` on API routes or in-memory Map cache
- **Cache invalidation**: On publish new test, bust test list cache

### 7.4 Performance Budget

| Operation | Target | Expected | Notes |
|-----------|--------|----------|-------|
| List practice tests | <200ms | ~50ms | Simple aggregate query |
| Fetch test questions (98) | <500ms | ~150ms | JOIN + ORDER BY on indexed columns |
| Fetch progress (N attempts) | <300ms | ~80ms | Filtered by userId + testId |
| Random test exclusion overhead | <5ms | ~1ms | Boolean index filter |
| Save test results | <1s | ~500ms | Existing + 2 fields (negligible impact) |

---

## 8. Testing Strategy

### 8.1 Unit Tests

**Target:** Service layer functions, validation logic, attempt number calculation

| Test File | Tests |
|-----------|-------|
| `tests/services/practiceTestService.test.ts` | `listPublishedTests`, `getTestWithQuestions`, `getNextAttemptNumber`, `validateTestComposition` |
| `tests/services/questionReservation.test.ts` | `reserveQuestions`, `unreserveQuestions`, `validatePoolThreshold` |

**Key test cases:**
- `getNextAttemptNumber` returns 1 for first attempt, increments correctly
- `validateTestComposition` rejects: wrong module question counts, duplicate IDs, already-reserved questions, inactive questions
- `reserveQuestions` sets `isReserved=true` on all provided question IDs
- `validatePoolThreshold` rejects if pool would drop below 400 unreserved questions

### 8.2 Integration Tests

**Target:** API endpoints with real database

| Test File | Tests |
|-----------|-------|
| `tests/api/practice-tests.test.ts` | List, fetch, progress, error cases |
| `tests/api/practice-tests-admin.test.ts` | Create, publish, validation errors |
| `tests/api/questions-practice-reserved.test.ts` | Random test excludes reserved questions |

**Key test cases:**
- `GET /api/practice-tests/{id}` returns 98 questions in same order on repeated calls
- `GET /api/questions/practice?moduleType=math` returns zero questions with `isReserved=true`
- `POST /api/test-results` with `practiceTestId` creates result with correct `attemptNumber`
- Admin create rejects duplicate question IDs across modules
- Admin publish transaction: both `PracticeTest.isPublished` and `Question.isReserved` update atomically

### 8.3 E2E Tests

**Target:** Full user flows via browser

| Flow | Steps |
|------|-------|
| Take practice test | Select PT1 → Start → Answer 98 questions → Submit → Verify results saved with `practiceTestId` |
| Retake shows same questions | Complete PT1 Attempt 1 → Start Attempt 2 → Verify question IDs match |
| Random test excludes reserved | After PT1 published → Take random test → Verify no PT1 questions appear |
| Progress tracking | Complete PT1 twice → Check progress page → Verify both attempts with improvement calc |

---

## 9. Implementation Notes

### 9.1 Files to Create

| File | Feature | Description |
|------|---------|-------------|
| `prisma/migrations/<timestamp>_add_practice_tests/` | #62 | Schema migration |
| `src/app/api/practice-tests/route.ts` | #63 | List endpoint |
| `src/app/api/practice-tests/[id]/route.ts` | #63 | Question fetch endpoint |
| `src/app/api/practice-tests/[id]/progress/route.ts` | #66 | Progress endpoint |
| `src/app/api/admin/practice-tests/route.ts` | #67 | Admin create endpoint |
| `src/app/api/admin/practice-tests/[id]/publish/route.ts` | #67 | Admin publish endpoint |
| `src/app/practice-tests/page.tsx` | #65 | Test selection page |
| `src/components/test/PracticeTestGrid.tsx` | #65 | Grid component |
| `src/components/test/AttemptBadge.tsx` | #65 | Badge component |
| `src/components/test/ProgressChart.tsx` | #66 | Chart component |
| `src/lib/services/practiceTestService.ts` | #63 | Service layer |
| `src/lib/services/questionReservation.ts` | #63 | Reservation logic |
| `scripts/seed-practice-tests.ts` | #68 | Seeding script |

### 9.2 Files to Modify

| File | Feature | Change |
|------|---------|--------|
| `prisma/schema.prisma` | #62 | Add PracticeTest, PracticeTestQuestion models; modify Question, TestResult |
| `src/app/api/questions/practice/route.ts` | #63 | Add `isReserved: false` to where clause |
| `src/app/api/test-results/route.ts` | #66 | Accept `practiceTestId`, calculate `attemptNumber` |
| `src/hooks/useTestState.ts` | #65 | Add `practiceTestId` parameter, dual-mode fetch |
| `src/types/test.ts` | #65 | Add `PracticeTest`, `PracticeTestSummary` interfaces |
| `src/app/practice-test/page.tsx` | #65 | Accept `practiceTestId` from URL params |

### 9.3 Dependencies

- **Existing**: Prisma, Next.js App Router, NextAuth, Zod, Lucide icons
- **New**: None — all features implementable with existing stack
- **Optional**: `recharts` or `chart.js` for progress charts (if not already installed)

### 9.4 Environment Variables

- No new environment variables required
- Existing `DATABASE_URL` and NextAuth config sufficient

### 9.5 Seeding Script Design (Practice Tests 1 & 2)

**Script**: `scripts/seed-practice-tests.ts`

**Algorithm:**
1. Query all unreserved, active questions grouped by `(moduleType, category, difficulty)`
2. For each practice test, select questions matching SAT distribution (Appendix C of PRD):
   - Module 0 (RW-1): 27 questions — 15 reading-comp, 12 writing
   - Module 1 (RW-2): 27 questions — 15 reading-comp, 12 writing
   - Module 2 (Math-1): 22 questions — 9 algebra, 6 advanced-math, 5 geometry, 2 statistics
   - Module 3 (Math-2): 22 questions — 9 algebra, 6 advanced-math, 5 geometry, 2 statistics
3. Within each category, apply difficulty distribution: 30% easy, 50% medium, 20% hard
4. Order questions within each module: easy first, then medium, then hard (progressive difficulty)
5. Create PracticeTest + PracticeTestQuestion rows in transaction
6. Mark all selected questions as `isReserved = true`
7. Log: test name, question count per module, difficulty breakdown, reserved count

**Safety checks:**
- Verify ≥400 unreserved questions remain after reserving both tests
- Verify no question is already reserved
- Verify category/difficulty distribution matches target (allow ±2 questions tolerance)

---

## 10. Rollout Plan

### Phase 1: Foundation (Week 1-2)

| Step | Action | Validation |
|------|--------|------------|
| 1 | Run Prisma migration (add tables + columns) | `npx prisma migrate deploy` succeeds |
| 2 | Deploy API endpoints (list, fetch, progress) | Integration tests pass |
| 3 | Add `isReserved: false` filter to random test API | Existing practice test still works |

### Phase 2: Core UX (Week 3-4)

| Step | Action | Validation |
|------|--------|------------|
| 4 | Build practice test selection page | Page renders test grid |
| 5 | Modify `useTestState` for dual-mode | Fixed tests return same questions |
| 6 | Add attempt tracking to test results API | Attempt number increments correctly |
| 7 | Build progress chart component | Chart renders with mock data |

### Phase 3: Content (Week 5-6)

| Step | Action | Validation |
|------|--------|------------|
| 8 | Build admin create/publish endpoints | Admin can create and publish test |
| 9 | Run seed script for Practice Tests 1 & 2 | Both tests visible on selection page |
| 10 | QA: Take both tests end-to-end | Questions render, scores save |

### Phase 4: Launch (Week 7)

| Step | Action | Validation |
|------|--------|------------|
| 11 | Performance testing (load test APIs) | Within latency targets |
| 12 | Soft launch to beta cohort | Monitor errors, gather feedback |
| 13 | Full launch | Announce feature, track KPIs |

### Rollback Plan

- If migration fails: `npx prisma migrate reset` (dev only) or restore DB backup
- If API errors spike: Revert deployment, all new endpoints are additive (no breaking changes to existing endpoints)
- If `isReserved` filter causes issues: Remove single-line filter in random test API (instant rollback)

---

## 11. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Migration failure on production SQL Server | HIGH | LOW | Test migration on staging first; keep DB backup; migration is additive-only |
| `useTestState` refactor introduces bugs in random tests | HIGH | MEDIUM | Feature-flag dual-mode; write regression tests for existing random flow before modifying |
| Seeding script selects unbalanced question set | MEDIUM | MEDIUM | Validation function checks distribution; allow ±2 tolerance; human review before publish |
| Performance regression on random test API from `isReserved` filter | LOW | LOW | Composite index `(isActive, isReserved, moduleType)` covers the query |
| Students confuse practice tests with random tests | MEDIUM | HIGH | Distinct navigation paths: `/practice-tests` (numbered tests) vs `/practice-test` (random); clear UI labels |

---

## 12. Monitoring & Observability

### 12.1 Key Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Practice test API latency (p95) | Server logs | >500ms |
| Question fetch latency (p95) | Server logs | >750ms |
| Failed test result saves | Error logs | >5/hour |
| Reserved question count | DB query | Exceeds 30% of total pool |
| Practice test completion rate | TestResult count | <20% (below target) |
| Retake rate | TestResult WHERE attemptNumber > 1 | <10% (below target) |

### 12.2 Logging

- `[practice-test]` prefix on all new API route logs
- Log: test ID, user ID, attempt number, question count, response time on every fetch
- Log: reservation changes (which questions reserved/unreserved, by which admin)
- Error logging: Failed creates, failed publishes, validation rejections with full context

### 12.3 Dashboard Queries

**Reserved pool health:**
```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN isReserved = 1 THEN 1 ELSE 0 END) as reserved,
  SUM(CASE WHEN isReserved = 0 THEN 1 ELSE 0 END) as available
FROM questions WHERE isActive = 1
```

**Practice test adoption:**
```sql
SELECT pt.name, 
  COUNT(DISTINCT tr.userId) as uniqueStudents,
  COUNT(tr.id) as totalAttempts,
  AVG(tr.score) as avgScore
FROM practice_tests pt
LEFT JOIN test_results tr ON tr.practiceTestId = pt.id
GROUP BY pt.name
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-19
