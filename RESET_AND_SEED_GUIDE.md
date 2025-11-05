# Reset and Seed Sample Questions Script

## Overview
This script (`scripts/reset-and-seed-sample-questions.ts`) resets the database and seeds it with exactly 4 sample SAT questions for testing purposes.

## Features
- ✅ Deletes all existing questions from the database
- ✅ Inserts 4 realistic SAT-style questions (2 math, 2 reading-writing)
- ✅ Uses null for optional fields (imageUrl, imageAlt, passage, chartData)
- ✅ Uses empty object `{}` for wrongAnswerExplanations
- ✅ Uses correctAnswer as index (0-3) per SAT convention
- ✅ Validates that exactly 4 questions exist after seeding
- ✅ Exits with process.exit(1) on any error
- ✅ Idempotent - safe to re-run at any time

## Usage

### Run the script
```bash
npx tsx scripts/reset-and-seed-sample-questions.ts
```

### Expected Output
```
🔄 Resetting and seeding sample questions...

============================================================

🗑️  Deleting all existing questions...
✅ Deleted X existing question(s)

📝 Inserting sample questions...
  ✅ math - algebra: If 3x + 7 = 22, what is the value of x?...
  ✅ math - geometry: A rectangle has a length of 12 units and a wid...
  ✅ reading-writing - reading-comprehension: Which choice best states the main purpose of th...
  ✅ reading-writing - vocabulary: As used in the text, what does the word "meti...

✅ Successfully inserted 4 questions

🔍 Validating seeded data...
✅ Validation passed: 4 questions in database
   - Math questions: 2
   - Reading-Writing questions: 2

============================================================
✅ Reset and seed completed successfully!
============================================================

You can now test the /api/questions endpoint with:
  GET /api/questions
```

## Sample Questions

### Math Question 1: Linear Equations
- **Question**: If 3x + 7 = 22, what is the value of x?
- **Options**: ['5', '7', '15', '29']
- **Correct Answer**: 0 (which is '5')
- **Category**: algebra
- **Difficulty**: medium

### Math Question 2: Geometry
- **Question**: A rectangle has a length of 12 units and a width of 5 units. What is the area of the rectangle?
- **Options**: ['17', '34', '60', '120']
- **Correct Answer**: 2 (which is '60')
- **Category**: geometry
- **Difficulty**: medium

### Reading-Writing Question 1: Main Ideas
- **Question**: Which choice best states the main purpose of the text?
- **Passage**: About honey bees and their importance to agriculture
- **Options**: 4 options about honey bee characteristics vs. their agricultural importance
- **Correct Answer**: 1 (importance to agriculture)
- **Category**: reading-comprehension
- **Difficulty**: easy

### Reading-Writing Question 2: Vocabulary
- **Question**: As used in the text, what does the word "meticulous" most nearly mean?
- **Passage**: About a scientist's careful research methods
- **Options**: ['Careless', 'Extremely careful and precise', 'Quick and efficient', 'Creative and innovative']
- **Correct Answer**: 1 (Extremely careful and precise)
- **Category**: vocabulary
- **Difficulty**: medium

## Testing the API

After running the script, test the API endpoint:

### Test 1: Get all questions
```bash
curl http://localhost:3000/api/questions
```

**Expected Result**: 
- Returns exactly 4 questions
- No 500 errors
- No JSON serialization errors
- All questions have proper field structure

### Test 2: Filter by module type
```bash
curl "http://localhost:3000/api/questions?category=algebra"
curl "http://localhost:3000/api/questions?category=reading-comprehension"
```

### Test 3: Pagination
```bash
curl "http://localhost:3000/api/questions?limit=2&offset=0"
curl "http://localhost:3000/api/questions?limit=2&offset=2"
```

## Verification Script

A verification script is provided to test the seeded data:

```bash
npx tsx scripts/verify-reset-and-seed.ts
```

This script verifies:
- ✅ Exactly 4 questions exist
- ✅ 2 math and 2 reading-writing questions
- ✅ All questions serialize to JSON correctly
- ✅ All required fields are present
- ✅ Optional fields are null or empty
- ✅ correctAnswer values are valid indices (0-3)

## Field Specifications

All questions include these fields:

**Required Fields:**
- `subtopicId`: null (not linked to subtopic records)
- `moduleType`: 'math' | 'reading-writing'
- `difficulty`: 'easy' | 'medium' | 'hard'
- `category`: e.g., 'algebra', 'geometry', 'reading-comprehension', 'vocabulary'
- `subtopic`: string (e.g., 'linear-equations', 'area-and-volume')
- `question`: The question text
- `options`: Array of 4 answer options
- `correctAnswer`: Index (0-3) of the correct answer
- `explanation`: Explanation of the correct answer
- `timeEstimate`: Estimated time in seconds
- `source`: 'SAT Practice'
- `tags`: Array of relevant tags
- `isActive`: true

**Optional Fields (set to null or {}):**
- `passage`: null for math questions, text for reading questions
- `wrongAnswerExplanations`: {} (empty object)
- `imageUrl`: null
- `imageAlt`: null
- `chartData`: null

## Error Handling

The script will exit with `process.exit(1)` if:
- Database connection fails
- Question deletion fails
- Question insertion fails
- Validation fails (not exactly 4 questions)
- Validation fails (not 2 math and 2 reading-writing)

## Troubleshooting

### Database Connection Error
If you see `Can't reach database server`, ensure:
1. Your `.env` or `.env.local` file has the correct `DATABASE_URL`
2. The database server is running
3. You have network access to the database

### Validation Errors
If validation fails:
1. Check that no other process is modifying the database
2. Re-run the script (it's idempotent and safe to re-run)

## Integration with CI/CD

This script can be used in CI/CD pipelines for testing:

```yaml
# Example GitHub Actions workflow
- name: Seed test data
  run: npx tsx scripts/reset-and-seed-sample-questions.ts

- name: Test API endpoint
  run: |
    # Start the server
    npm start &
    # Wait for server to start
    sleep 5
    # Test the endpoint
    curl http://localhost:3000/api/questions
```
