# Question Review API Test

## Overview
This test script validates the end-to-end functionality of the question review feature by testing the API endpoints for submitting and fetching reviews.

## What It Tests
The script performs the following operations:

1. **Setup Test Data**
   - Creates/finds a test user: `test-reviewer@ducksat.com`
   - Creates/finds a test question: `test-review-question-api`

2. **Find Question for Review**
   - Locates an active question available for review
   - Displays question metadata (ID, category, difficulty)

3. **Submit Review**
   - Submits a review via the database (simulating POST API behavior)
   - Review data:
     - Rating: 4 (out of 5)
     - Description: "Feature test review -- ignore."
     - Has Diagram: false

4. **Fetch Reviews**
   - Retrieves all reviews for the question (simulating GET API behavior)
   - Includes user information with each review

5. **Verify Data Integrity**
   - Confirms the submitted review exists in the database
   - Validates all fields match the submitted data:
     - Review ID
     - User ID and information
     - Question ID
     - Rating (4 stars)
     - Description
     - Has Diagram flag
     - Timestamps (createdAt, updatedAt)

6. **Output Verification**
   - Displays comprehensive verification logs including:
     - Review ID
     - User details (name, email, ID)
     - Question ID
     - Rating
     - Description
     - Has Diagram flag
     - Timestamps (ISO format)

7. **Optional Cleanup**
   - Optionally deletes the test review from the database
   - Verifies successful deletion

## Running the Test

### Basic Test (without cleanup)
```bash
npm run test:review-api
```

### Test with Cleanup
```bash
npm run test:review-api -- --cleanup
```

### Alternative (using tsx directly)
```bash
npx tsx scripts/test-review-api.ts
npx tsx scripts/test-review-api.ts --cleanup
```

## Prerequisites

1. **PostgreSQL Database**
   - Running PostgreSQL instance
   - Database created (e.g., `ducksat_test`)

2. **Environment Variables**
   - `DATABASE_URL`: PostgreSQL connection string
   - Example: `postgresql://postgres:postgres@localhost:5432/ducksat_test`

3. **Prisma Setup**
   - Prisma Client generated: `npm run db:generate`
   - Database schema pushed: `npm run db:push`

## Expected Output

When successful, the script outputs:
```
🧪 Testing Question Review API Feature (End-to-End)
============================================================

📦 Step 1: Setting up test data...
✅ Test user created/found: test-reviewer@ducksat.com
   User ID: [generated-id]
✅ Test question created/found: test-review-question-api
   Question: What is the value of x in the equation 2x + 5 = 15...

🔍 Step 2: Finding question ID for review...
✅ Found question for review:
   Question ID: test-review-question-api
   Category: algebra
   Difficulty: medium

📝 Step 3: Submitting review via POST /api/questions/[id]/review...
   Review Data: { rating: 4, description: 'Feature test review -- ignore.', hasDiagram: false }
✅ Review submitted successfully!
   [Review details...]

📋 Step 4: Fetching reviews via GET /api/questions/[id]/review...
✅ Found 1 review(s) for question test-review-question-api

✅ Step 5: Verifying review data...
✅ Test review found! Verifying data...
   ✅ Review ID matches
   ✅ User ID matches
   ✅ Question ID matches
   ✅ Rating matches
   ✅ Description matches
   ✅ Has Diagram matches
   ✅ User email matches
   ✅ User name matches

============================================================
📊 VERIFICATION OUTPUT
============================================================
Test Review Details:
  Review ID:     [review-id]
  User:          Test Reviewer (test-reviewer@ducksat.com)
  User ID:       [user-id]
  Question ID:   test-review-question-api
  Rating:        4 / 5 stars
  Description:   "Feature test review -- ignore."
  Has Diagram:   false
  Created At:    [ISO timestamp]
  Updated At:    [ISO timestamp]
============================================================

🧹 Step 6 (Optional): Cleanup...
   [Cleanup status...]

============================================================
✨ ALL TESTS PASSED SUCCESSFULLY! ✨
============================================================

✅ End-to-end review feature is working correctly:
   - Reviews can be saved to the database
   - Reviews can be fetched from the database
   - Review data integrity is maintained
   - User information is properly associated
   - Timestamps are correctly recorded
```

## What This Confirms

✅ **Database Schema**: The `QuestionReview` model is correctly set up
✅ **Review Creation**: Reviews can be successfully created in the database
✅ **Review Retrieval**: Reviews can be fetched with associated user data
✅ **Data Integrity**: All review fields are correctly stored and retrieved
✅ **User Association**: User information is properly linked to reviews
✅ **Timestamps**: Created and updated timestamps are automatically managed
✅ **Unique Constraint**: One review per user per question (enforced by upsert)

## Cleanup

### Manual Cleanup (if --cleanup flag not used)
If you run the test without the `--cleanup` flag, the test review will remain in the database. The script provides a SQL command to manually delete it:

```sql
DELETE FROM question_reviews WHERE id = '[review-id]';
```

### Automatic Cleanup
Run the test with the `--cleanup` flag to automatically delete the test review after verification.

## Troubleshooting

### Database Connection Error
```
Error: P1000: Authentication failed against database server
```
**Solution**: Check your `DATABASE_URL` in `.env` file

### Prisma Client Not Generated
```
Error: Cannot find module '@prisma/client'
```
**Solution**: Run `npm run db:generate`

### Schema Not Synced
```
Error: Table 'question_reviews' does not exist
```
**Solution**: Run `npm run db:push`

## Related Files

- **Test Script**: `scripts/test-review-api.ts`
- **API Route**: `src/app/api/questions/[id]/review/route.ts`
- **Database Schema**: `prisma/schema.prisma`
- **Review Feature Documentation**: `REVIEW_FEATURE.md`

## Next Steps

After confirming the test passes, you can:
1. Test the review feature through the UI at `/question-review`
2. View the database records using Prisma Studio: `npm run db:studio`
3. Test updating an existing review (script handles this with upsert)
4. Test the authentication flow with actual HTTP requests to the API
