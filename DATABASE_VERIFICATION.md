# Database Verification Guide

## How to Check the Review Feature in the Database

Once you have the database set up and running, use these methods to verify the review feature is working correctly.

## Using Prisma Studio (Recommended)

1. **Open Prisma Studio:**
   ```bash
   npm run db:studio
   ```

2. **Navigate to the `question_reviews` table**
   - You should see all the fields: id, questionId, userId, rating, description, hasDiagram, createdAt, updatedAt

3. **Check Review Records:**
   - Verify rating is between 1-5
   - Check that each user has only one review per question
   - View the relationships to users and questions

## Using SQL Queries

If you prefer direct SQL access:

### 1. View All Reviews
```sql
SELECT 
  qr.id,
  qr.rating,
  qr.description,
  qr.hasDiagram,
  qr.createdAt,
  u.name as user_name,
  u.email as user_email,
  q.question as question_text
FROM question_reviews qr
JOIN users u ON qr."userId" = u.id
JOIN questions q ON qr."questionId" = q.id
ORDER BY qr.createdAt DESC;
```

### 2. Get Average Rating per Question
```sql
SELECT 
  q.id,
  q.question,
  COUNT(qr.id) as review_count,
  ROUND(AVG(qr.rating), 2) as average_rating
FROM questions q
LEFT JOIN question_reviews qr ON q.id = qr."questionId"
GROUP BY q.id, q.question
HAVING COUNT(qr.id) > 0
ORDER BY average_rating DESC;
```

### 3. Get User's Reviews
```sql
SELECT 
  qr.rating,
  qr.description,
  qr.hasDiagram,
  qr.createdAt,
  q.question,
  q.category,
  q.difficulty
FROM question_reviews qr
JOIN questions q ON qr."questionId" = q.id
WHERE qr."userId" = 'USER_ID_HERE'
ORDER BY qr.createdAt DESC;
```

### 4. Find Questions with Diagrams (based on reviews)
```sql
SELECT DISTINCT
  q.id,
  q.question,
  q.category,
  COUNT(qr.id) as reviews_indicating_diagram
FROM questions q
JOIN question_reviews qr ON q.id = qr."questionId"
WHERE qr."hasDiagram" = true
GROUP BY q.id, q.question, q.category
ORDER BY reviews_indicating_diagram DESC;
```

### 5. Verify Unique Constraint
```sql
-- This should return 0 rows (no duplicates)
SELECT 
  "userId",
  "questionId",
  COUNT(*) as count
FROM question_reviews
GROUP BY "userId", "questionId"
HAVING COUNT(*) > 1;
```

## Using Prisma Client (Programmatic)

### Check Reviews for a Specific Question
```typescript
const reviews = await prisma.questionReview.findMany({
  where: {
    questionId: 'your-question-id',
  },
  include: {
    user: {
      select: {
        name: true,
        email: true,
      },
    },
  },
});

console.log(`Found ${reviews.length} reviews`);
reviews.forEach(review => {
  console.log(`${review.user.name}: ${review.rating} stars - ${review.description}`);
});
```

### Get a User's Review for a Question
```typescript
const userReview = await prisma.questionReview.findUnique({
  where: {
    userId_questionId: {
      userId: 'user-id',
      questionId: 'question-id',
    },
  },
});

if (userReview) {
  console.log('User has already reviewed this question');
  console.log(`Rating: ${userReview.rating}`);
} else {
  console.log('User has not reviewed this question yet');
}
```

### Get Review Statistics
```typescript
const stats = await prisma.questionReview.aggregate({
  _avg: {
    rating: true,
  },
  _count: {
    id: true,
  },
  _max: {
    rating: true,
  },
  _min: {
    rating: true,
  },
  where: {
    questionId: 'your-question-id',
  },
});

console.log(`Average Rating: ${stats._avg.rating}`);
console.log(`Total Reviews: ${stats._count.id}`);
console.log(`Highest Rating: ${stats._max.rating}`);
console.log(`Lowest Rating: ${stats._min.rating}`);
```

## Test Scenarios to Verify

### ✅ Test 1: Create a Review
1. Submit a review via the UI or API
2. Check database - should see new record in `question_reviews` table
3. Verify all fields are populated correctly

### ✅ Test 2: Update a Review
1. Submit another review for the same question with the same user
2. Check database - should still have only ONE record (not two)
3. Verify the record has updated values

### ✅ Test 3: User Authentication
1. Try to submit review without being logged in
2. Should receive 401 Unauthorized error
3. Database should not have any new records

### ✅ Test 4: Rating Validation
1. Try to submit review with rating = 0 or 6 (invalid)
2. Should receive 400 Bad Request error
3. Database should not have any new records

### ✅ Test 5: Optional Fields
1. Submit review with only rating (no description)
2. Database should save with description = NULL
3. Submit review with description
4. Database should save with description text

### ✅ Test 6: Cascade Delete
1. Delete a question that has reviews
2. Check database - reviews should be automatically deleted
3. Same for deleting a user

## Expected Database Schema

```sql
CREATE TABLE "question_reviews" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "description" TEXT,
    "hasDiagram" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "question_reviews_userId_questionId_key" 
ON "question_reviews"("userId", "questionId");

CREATE INDEX "question_reviews_questionId_idx" 
ON "question_reviews"("questionId");

CREATE INDEX "question_reviews_userId_idx" 
ON "question_reviews"("userId");

ALTER TABLE "question_reviews" 
ADD CONSTRAINT "question_reviews_questionId_fkey" 
FOREIGN KEY ("questionId") REFERENCES "questions"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "question_reviews" 
ADD CONSTRAINT "question_reviews_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;
```

## Sample Data to Expect

After submitting a few reviews, you might see data like:

| id | questionId | userId | rating | description | hasDiagram | createdAt |
|----|------------|--------|--------|-------------|------------|-----------|
| clx1... | q1... | u1... | 5 | "Great question!" | false | 2025-11-02... |
| clx2... | q1... | u2... | 4 | "Could use a diagram" | true | 2025-11-02... |
| clx3... | q2... | u1... | 3 | NULL | false | 2025-11-02... |

Note: Each (userId, questionId) pair should appear only once due to the unique constraint.
