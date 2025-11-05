# Testing the /api/questions Endpoint

This guide explains how to test the `/api/questions` endpoint to ensure it's working correctly.

## Quick Start

### 1. Seed Test Data

First, populate the database with sample questions:

```bash
npm run seed:questions-test
```

This will create:
- 2 topics (Algebra, Reading Comprehension)
- 2 subtopics (Linear Equations, Main Ideas)
- 5 active questions (math and reading)
- 1 inactive question (to test filtering)

### 2. Run Tests

Execute the comprehensive test suite:

```bash
npm run test:api-questions
```

This runs 7 test scenarios covering:
- ✅ Fetch all questions (default pagination)
- ✅ Empty result handling (non-existent category)
- ✅ Pagination (limit & offset)
- ✅ Sorting (ascending by createdAt)
- ✅ Category filtering
- ✅ JSON serialization of all fields
- ✅ Related data (subtopicRef) serialization

### Expected Output

```
🧪 Testing /api/questions Endpoint

============================================================

📝 Test 1: Fetch all questions (default pagination)
✅ PASSED - Found 5 questions
   Total: 5, Limit: 50, Offset: 0
   Filters: 2 categories, 2 subtopics, 2 sources

📝 Test 2: Empty result (non-existent category)
✅ PASSED - Empty array returned correctly

📝 Test 3: Pagination (limit=5, offset=0)
✅ PASSED - 5 questions returned with correct pagination

📝 Test 4: Sorting (ascending by createdAt)
✅ PASSED - Questions sorted correctly (asc)

📝 Test 5: Filter by category
✅ PASSED - 2 questions filtered by category "algebra"

📝 Test 6: JSON serialization of all fields
✅ PASSED - All fields serialize correctly to JSON
   Sample question ID: test-mat...

📝 Test 7: Related data serialization (subtopicRef)
✅ PASSED - 3 questions with related data serialized correctly

============================================================
📊 TEST SUMMARY
============================================================
✅ Passed: 7
❌ Failed: 0
📝 Total: 7

✨ ALL TESTS PASSED! ✨
```

## Manual Testing

You can also test the endpoint manually using curl or a REST client.

### Basic Request

```bash
curl http://localhost:3000/api/questions
```

### With Filters

```bash
# Filter by category
curl "http://localhost:3000/api/questions?category=algebra"

# Filter by subtopic
curl "http://localhost:3000/api/questions?subtopic=linear-equations"

# Search
curl "http://localhost:3000/api/questions?search=equation"

# Pagination
curl "http://localhost:3000/api/questions?limit=10&offset=0"

# Sort ascending
curl "http://localhost:3000/api/questions?sortOrder=asc"

# Multiple filters
curl "http://localhost:3000/api/questions?category=algebra&limit=5&sortOrder=desc"
```

### Expected Response Format

```json
{
  "questions": [
    {
      "id": "test-math-1",
      "question": "What is the value of x in the equation 2x + 5 = 15?",
      "explanation": "To solve for x: 2x + 5 = 15 → 2x = 10 → x = 5",
      "passage": null,
      "options": ["5", "10", "7.5", "2.5"],
      "correctAnswer": 0,
      "tags": ["linear-equations", "algebra", "test"],
      "imageUrl": null,
      "imageAlt": null,
      "source": "Test Data",
      "difficulty": "medium",
      "category": "algebra",
      "subtopic": "linear-equations",
      "moduleType": "math",
      "timeEstimate": 90,
      "chartData": null,
      "wrongAnswerExplanations": {
        "1": "10 would be the result if you forgot to divide by 2",
        "2": "7.5 would be the result if you divided 15 by 2 instead of solving correctly",
        "3": "2.5 would be the result if you divided 5 by 2"
      },
      "reviewStatus": "approved",
      "reviewComments": "Good test question",
      "reviewedBy": "test-admin",
      "reviewedAt": "2025-11-05T03:40:00.000Z",
      "createdAt": "2025-11-05T03:40:00.000Z",
      "updatedAt": "2025-11-05T03:40:00.000Z",
      "subtopicRef": {
        "id": "clx...",
        "name": "Linear Equations",
        "description": "Solving linear equations and inequalities",
        "topic": {
          "id": "clx...",
          "name": "Algebra",
          "moduleType": "math"
        }
      }
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  },
  "filters": {
    "categories": ["algebra", "reading-comprehension"],
    "subtopics": ["linear-equations", "main-ideas"],
    "sources": ["Test Data", "Official SAT"]
  }
}
```

## Error Testing

### Invalid Pagination

```bash
curl "http://localhost:3000/api/questions?limit=invalid"
```

Expected:
```json
{
  "error": "Invalid pagination parameters",
  "details": "Limit and offset must be valid numbers"
}
```

### Non-existent Category

```bash
curl "http://localhost:3000/api/questions?category=non-existent"
```

Expected:
```json
{
  "questions": [],
  "pagination": {
    "total": 0,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  },
  "filters": {
    "categories": ["algebra", "reading-comprehension"],
    "subtopics": ["linear-equations", "main-ideas"],
    "sources": ["Test Data", "Official SAT"]
  }
}
```

## Test Data Details

The seeded test data includes:

### Math Questions
1. **test-math-1**: Linear equation (medium difficulty)
   - Has subtopicRef relation
   - Approved review status
   - Has wrongAnswerExplanations

2. **test-math-2**: Circle area (hard difficulty)
   - No subtopicRef relation
   - Has chartData JSON field
   - Pending review status

3. **test-math-3**: Linear equation (easy difficulty)
   - Has subtopicRef relation
   - Approved review status

### Reading Questions
1. **test-reading-1**: Main idea with passage (easy difficulty)
   - Has subtopicRef relation
   - Approved review status

2. **test-reading-2**: Author's perspective (medium difficulty)
   - Has subtopicRef relation
   - No review status

### Inactive Question
1. **test-inactive-1**: Should NOT appear in API results
   - Tests that `isActive: false` filter works

## Troubleshooting

### "No questions found"

If tests show 0 questions:
1. Run the seed script: `npm run seed:questions-test`
2. Check database connection in `.env`
3. Verify Prisma can connect: `npx prisma studio`

### Database Connection Error

```
Error: Can't reach database server
```

Solution:
1. Check `.env` has valid `DATABASE_URL`
2. Verify database is running
3. Check network connectivity

### "Some tests failed"

If specific tests fail:
1. Check the error message for details
2. Verify database has the expected data
3. Check that Prisma schema matches database

## Continuous Testing

For development, you can run tests automatically on changes:

```bash
# Watch mode (requires nodemon)
npx nodemon --watch src/app/api/questions --exec "npm run test:api-questions"
```

## Integration with Frontend

The frontend can consume this endpoint like this:

```typescript
// Example React component
const QuestionReview = () => {
  const [questions, setQuestions] = useState([]);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    const fetchQuestions = async () => {
      const response = await fetch('/api/questions?limit=10&offset=0');
      const data = await response.json();
      
      if (data.questions) {
        setQuestions(data.questions);
        setPagination(data.pagination);
        setFilters(data.filters);
      }
    };
    
    fetchQuestions();
  }, []);

  return (
    <div>
      {questions.map(q => (
        <QuestionCard key={q.id} question={q} />
      ))}
    </div>
  );
};
```

## Performance Testing

For load testing:

```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/questions

# Expected performance:
# - Response time: < 200ms
# - Throughput: > 50 req/sec
# - No failed requests
```

## Cleaning Up Test Data

To remove test data:

```bash
# Connect to Prisma Studio
npx prisma studio

# Or use Prisma Client
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
await prisma.question.deleteMany({ where: { tags: { has: 'test' } } });
await prisma.$disconnect();
"
```

## Next Steps

After confirming tests pass:
1. Deploy to staging environment
2. Run tests against staging
3. Monitor logs for any issues
4. Deploy to production
5. Set up continuous monitoring

## Support

If you encounter issues:
1. Check logs: `[/api/questions]` prefix
2. Review documentation: `API_QUESTIONS_FIX.md`
3. Security info: `SECURITY_ANALYSIS.md`
