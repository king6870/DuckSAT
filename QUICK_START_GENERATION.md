# Quick Start: Question Generation

Fast reference for the most common question generation tasks.

## Prerequisites

✅ Server running at `http://localhost:3000`  
✅ Admin access (logged in or API key set)  
✅ Environment variables configured (for production)

## Common Tasks

### 1. Generate Basic Questions (Default Settings)

```bash
node generate-questions.js
```

**What it does:**
- Generates 5 math + 5 reading questions
- Evaluates quality automatically
- Stores accepted questions in database
- Takes ~2-3 minutes

**Output:**
```
✅ Generated: 10
✅ Accepted: 8
✅ Stored: 8
```

---

### 2. Generate Math Questions Only

```bash
MATH_COUNT=10 READING_COUNT=0 node generate-questions.js
```

**What it does:**
- Generates 10 math questions only
- Includes charts/graphs automatically
- No reading passages

---

### 3. Generate Reading Questions Only

```bash
MATH_COUNT=0 READING_COUNT=10 node generate-questions.js
```

**What it does:**
- Generates 10 reading questions only
- Includes passages automatically
- No math problems

---

### 4. Generate Hard Questions

```bash
DIFFICULTY=hard node generate-questions.js
```

**What it does:**
- Filters to hard difficulty only
- Good for advanced practice
- 3-4 points per question

---

### 5. Batch Generation (Production)

```bash
MATH_COUNT=10 \
READING_COUNT=10 \
BATCH_COUNT=5 \
DELAY_MS=20000 \
BASE_URL=https://your-domain.com \
ADMIN_API_KEY=your-key \
node generate-questions.js
```

**What it does:**
- Generates 100 questions total (20 per batch)
- Runs 5 batches with 20-second delays
- Uses production server and API key
- Takes ~15-20 minutes

---

### 6. Test Without Storing

Add `storeInDatabase: false` in the API call, or use the test endpoint.

For API:
```typescript
const response = await fetch('/api/admin/unified-generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mathCount: 3,
    readingCount: 3,
    storeInDatabase: false,  // Don't save to database
  })
})
```

**What it does:**
- Generates questions
- Evaluates quality
- Returns results without storing
- Good for testing

---

### 7. Quick Test (3 questions)

```bash
MATH_COUNT=2 READING_COUNT=1 node generate-questions.js
```

**What it does:**
- Fast test generation
- Takes ~30-45 seconds
- Good for development testing

---

### 8. High Quality Only

```bash
TEMPERATURE=0.5 node generate-questions.js
```

**What it does:**
- Lower temperature = more consistent
- Better for production use
- Slightly less creative

---

### 9. More Creative Questions

```bash
TEMPERATURE=0.9 node generate-questions.js
```

**What it does:**
- Higher temperature = more creative
- Good for variety
- May need more review

---

### 10. Specific Topic

```bash
# Get topic ID from admin panel first
TOPIC_ID=clq1234567890 \
MATH_COUNT=20 \
node generate-questions.js
```

**What it does:**
- Generates questions for specific topic only
- Good for filling gaps in content

---

## Via API (Programmatic)

### Basic Generation

```typescript
import { unifiedQuestionGenerator } from '@/services/unifiedQuestionGenerator'

const result = await unifiedQuestionGenerator.generateQuestions({
  mathCount: 5,
  readingCount: 5,
  storeInDatabase: true,
})

console.log(`Accepted: ${result.summary.accepted}`)
```

### Advanced Options

```typescript
const result = await unifiedQuestionGenerator.generateQuestions({
  mathCount: 10,
  readingCount: 0,
  difficulty: 'hard',
  temperature: 0.8,
  includeCharts: true,
  storeInDatabase: true,
})
```

---

## Environment Variables Cheat Sheet

| Variable | Default | Common Values |
|----------|---------|---------------|
| `MATH_COUNT` | 5 | 0-50 |
| `READING_COUNT` | 5 | 0-50 |
| `BATCH_COUNT` | 1 | 1-20 |
| `DELAY_MS` | 15000 | 10000-30000 |
| `TEMPERATURE` | 0.7 | 0.5-0.9 |
| `DIFFICULTY` | - | easy, medium, hard |
| `BASE_URL` | localhost:3000 | your-domain.com |

---

## Common Issues

### ❌ "Cannot connect to server"

**Solution:**
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Generate questions
node generate-questions.js
```

---

### ❌ "Authentication required"

**Solution for local:**
1. Open browser → http://localhost:3000
2. Log in as admin
3. Keep browser open
4. Run script

**Solution for production:**
```bash
ADMIN_API_KEY=your-key node generate-questions.js
```

---

### ❌ "Low acceptance rate"

**Solution:**
```bash
# Try lower temperature for more consistency
TEMPERATURE=0.5 node generate-questions.js
```

---

### ⚠️ "Questions need review"

This is normal - questions flagged for review when:
- Evaluation service unavailable (uses fallback)
- Quality borderline (60-70% score)

**Action:** Review flagged questions in admin panel at:
```
/admin/questions?reviewStatus=pending
```

---

## Quick Tips

💡 **Start small**: Test with 3-5 questions before large batches  
💡 **Use delays**: Always wait 15+ seconds between batches  
💡 **Monitor quality**: Check acceptance rates (aim for >70%)  
💡 **Review flags**: Regularly check questions needing review  
💡 **Adjust temperature**: Lower for consistency, higher for variety  

---

## Next Steps

📖 **Full Documentation**: See `QUESTION_GENERATION.md`  
🔄 **Migration Guide**: See `MIGRATION_GUIDE.md`  
⚙️ **All Options**: Run `node generate-questions.js --help` (if implemented)

---

## Quick Examples Summary

```bash
# Basic (default)
node generate-questions.js

# Math only
MATH_COUNT=10 READING_COUNT=0 node generate-questions.js

# Hard difficulty
DIFFICULTY=hard node generate-questions.js

# Large batch
BATCH_COUNT=10 node generate-questions.js

# Production
BASE_URL=https://domain.com ADMIN_API_KEY=key node generate-questions.js
```

**That's it! Pick a command and start generating.**
