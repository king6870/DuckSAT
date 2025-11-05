# Test Plan for reset-and-seed-sample-questions.ts

## Pre-requisites
- Database is accessible
- Node.js and npm are installed
- Dependencies are installed (`npm install`)
- `.env` or `.env.local` has valid `DATABASE_URL`

## Test Scenario 1: Initial Seed (Empty Database)

### Steps:
1. Ensure database has no questions (or any state)
2. Run the script:
   ```bash
   npx tsx scripts/reset-and-seed-sample-questions.ts
   ```

### Expected Results:
- ✅ Script completes successfully (exit code 0)
- ✅ Output shows: "Deleted 0 existing question(s)" or similar
- ✅ Output shows: "Successfully inserted 4 questions"
- ✅ Output shows: "Validation passed: 4 questions in database"
- ✅ Output shows: "Math questions: 2" and "Reading-Writing questions: 2"
- ✅ Final message: "Reset and seed completed successfully!"

## Test Scenario 2: Re-running Script (Idempotent)

### Steps:
1. After Test Scenario 1, run the script again:
   ```bash
   npx tsx scripts/reset-and-seed-sample-questions.ts
   ```

### Expected Results:
- ✅ Script completes successfully (exit code 0)
- ✅ Output shows: "Deleted 4 existing question(s)"
- ✅ Output shows: "Successfully inserted 4 questions"
- ✅ Same validation results as Scenario 1
- ✅ Database still has exactly 4 questions

## Test Scenario 3: Seed with Existing Questions

### Steps:
1. Manually add some questions to the database (e.g., 10 questions)
2. Run the script:
   ```bash
   npx tsx scripts/reset-and-seed-sample-questions.ts
   ```

### Expected Results:
- ✅ Script completes successfully (exit code 0)
- ✅ Output shows: "Deleted 10 existing question(s)" (or whatever count)
- ✅ Output shows: "Successfully inserted 4 questions"
- ✅ Database now has exactly 4 questions (old ones deleted)

## Test Scenario 4: API Endpoint Validation

### Steps:
1. After seeding, start the application:
   ```bash
   npm run dev
   ```
2. Test the API endpoint:
   ```bash
   curl http://localhost:3000/api/questions
   ```

### Expected Results:
- ✅ HTTP 200 response
- ✅ Response contains exactly 4 questions
- ✅ No 500 errors
- ✅ No JSON serialization errors
- ✅ Response structure matches expected format:
  ```json
  {
    "questions": [
      {
        "id": "...",
        "question": "...",
        "options": [...],
        "correctAnswer": 0,
        "explanation": "...",
        "moduleType": "math",
        "category": "algebra",
        // ... other fields
      },
      // ... 3 more questions
    ],
    "pagination": {
      "total": 4,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    },
    "filters": {
      "categories": [...],
      "subtopics": [...],
      "sources": [...]
    }
  }
  ```

## Test Scenario 5: Filtering and Pagination

### Steps:
1. Test category filtering:
   ```bash
   curl "http://localhost:3000/api/questions?category=algebra"
   curl "http://localhost:3000/api/questions?category=geometry"
   curl "http://localhost:3000/api/questions?category=reading-comprehension"
   curl "http://localhost:3000/api/questions?category=vocabulary"
   ```

### Expected Results:
- ✅ Each filter returns the correct subset of questions
- ✅ Algebra: 1 question
- ✅ Geometry: 1 question
- ✅ Reading-comprehension: 1 question
- ✅ Vocabulary: 1 question

### Steps:
2. Test pagination:
   ```bash
   curl "http://localhost:3000/api/questions?limit=2&offset=0"
   curl "http://localhost:3000/api/questions?limit=2&offset=2"
   ```

### Expected Results:
- ✅ First call returns 2 questions
- ✅ Second call returns 2 questions
- ✅ Total of 4 unique questions across both calls

## Test Scenario 6: Verification Script

### Steps:
1. After seeding, run the verification script:
   ```bash
   npx tsx scripts/verify-reset-and-seed.ts
   ```

### Expected Results:
- ✅ All 6 tests pass:
  - Test 1: Total question count (4 questions)
  - Test 2: Module type distribution (2 math, 2 reading-writing)
  - Test 3: JSON serialization
  - Test 4: Required fields present
  - Test 5: Optional fields are null or {}
  - Test 6: correctAnswer is valid index
- ✅ Final message: "ALL VERIFICATION TESTS PASSED!"

## Test Scenario 7: Field Validation

### Steps:
1. After seeding, query the database directly or via API
2. Inspect each of the 4 questions

### Expected Results for All Questions:
- ✅ `subtopicId` is null
- ✅ `imageUrl` is null
- ✅ `imageAlt` is null
- ✅ `chartData` is null
- ✅ `wrongAnswerExplanations` is `{}` (empty object)
- ✅ `correctAnswer` is a number between 0-3
- ✅ `options` is an array with 4 strings
- ✅ `isActive` is true
- ✅ `moduleType` is either 'math' or 'reading-writing'
- ✅ All required fields are present (not null/undefined)

### Expected Results for Math Questions:
- ✅ `passage` is null

### Expected Results for Reading-Writing Questions:
- ✅ `passage` is a non-null string

## Test Scenario 8: Error Handling

### Steps:
1. Stop the database server or make it inaccessible
2. Run the script:
   ```bash
   npx tsx scripts/reset-and-seed-sample-questions.ts
   ```

### Expected Results:
- ✅ Script fails with exit code 1
- ✅ Error message shows database connection error
- ✅ Error is logged to console

### Steps:
3. Restore database access
4. Corrupt database schema (e.g., remove a required column)
5. Run the script again

### Expected Results:
- ✅ Script fails with exit code 1
- ✅ Error message shows database/schema error

## Success Criteria

All of the following must be true:
- ✅ Script runs successfully in all normal scenarios
- ✅ Script is idempotent (can be run multiple times safely)
- ✅ Exactly 4 questions are seeded every time
- ✅ 2 math and 2 reading-writing questions
- ✅ API endpoint returns all 4 questions without errors
- ✅ No JSON serialization errors
- ✅ All required fields are present and valid
- ✅ Optional fields are null or empty as specified
- ✅ Filtering and pagination work correctly
- ✅ Script fails gracefully with exit code 1 on errors
- ✅ Verification script passes all tests

## Regression Testing

After any changes to the script or Question model, re-run all scenarios to ensure:
1. Script still works
2. Data format matches API expectations
3. No new serialization issues
4. Error handling still works

## Notes

- The script uses `deleteMany({})` to delete ALL questions, so use with caution in production
- Sample data is for testing purposes only
- Questions use generic SAT-style content and are not official SAT questions
