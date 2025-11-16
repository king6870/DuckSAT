# Question Generation System - Unified Documentation

This document describes the streamlined question generation system for DuckSAT.

## Overview

The question generation system has been consolidated into a unified architecture with three main components:

1. **Unified Service** (`src/services/unifiedQuestionGenerator.ts`) - Core generation logic
2. **Unified API** (`src/app/api/admin/unified-generate/route.ts`) - REST endpoint
3. **CLI Runner** (`generate-questions.js`) - Command-line interface

## Features

✅ **Unified Logic** - All generation logic in one well-organized service  
✅ **Flexible Options** - Control every aspect of generation  
✅ **Math & Reading** - Generate both question types  
✅ **Quality Evaluation** - Built-in evaluation with Grok/fallback  
✅ **Database Storage** - Optional automatic storage  
✅ **Image Generation** - Automatic chart/graph generation for math  
✅ **Retry Logic** - Automatic retries on failures  
✅ **Comprehensive Stats** - Detailed generation statistics  

## Quick Start

### 1. Web Interface (Recommended for Testing)

Navigate to your server's admin panel and use the question generation UI.

### 2. Command Line (Recommended for Batch Generation)

```bash
# Basic usage - generates 5 math + 5 reading questions
node generate-questions.js

# Generate 30 questions across 3 batches
MATH_COUNT=10 READING_COUNT=10 BATCH_COUNT=3 node generate-questions.js

# Math questions only
MATH_COUNT=10 READING_COUNT=0 node generate-questions.js

# Hard difficulty only
DIFFICULTY=hard node generate-questions.js

# Production with API key
BASE_URL=https://your-domain.com ADMIN_API_KEY=your-key node generate-questions.js
```

### 3. Programmatic (In Your Code)

```typescript
import { unifiedQuestionGenerator } from '@/services/unifiedQuestionGenerator'

// Generate questions
const result = await unifiedQuestionGenerator.generateQuestions({
  mathCount: 5,
  readingCount: 5,
  storeInDatabase: true,
  temperature: 0.7,
})

console.log(result.summary)
// { generated: 10, evaluated: 10, accepted: 8, rejected: 2, stored: 8 }
```

## Configuration Options

All options work across all three interfaces (Service, API, CLI).

### Question Counts

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mathCount` | number | 5 | Number of math questions to generate |
| `readingCount` | number | 5 | Number of reading questions to generate |

### Filtering

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `moduleType` | string | - | Filter by 'math' or 'reading-writing' |
| `difficulty` | string | - | Filter by 'easy', 'medium', or 'hard' |
| `topicId` | string | - | Generate for specific topic UUID |
| `subtopicId` | string | - | Generate for specific subtopic UUID |

### AI Parameters

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `temperature` | number | 0.7 | AI creativity (0=deterministic, 2=creative) |
| `maxTokens` | number | 4000 | Maximum response length |

### Feature Flags

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `includeCharts` | boolean | true | Include charts/graphs for math questions |
| `includePassages` | boolean | true | Include passages for reading questions |
| `storeInDatabase` | boolean | false | Automatically store accepted questions |
| `skipEvaluation` | boolean | false | Skip quality evaluation step |

### CLI-Only Options

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `BATCH_COUNT` | 1 | Number of batches to run |
| `DELAY_MS` | 15000 | Delay between batches (milliseconds) |
| `RETRY_ATTEMPTS` | 3 | Retry attempts on failure |
| `RETRY_DELAY_MS` | 5000 | Delay between retries (milliseconds) |

## Architecture

### Service Layer (`unifiedQuestionGenerator.ts`)

The core service handles:
- **Generation**: Calls GPT-5/Azure OpenAI to generate questions
- **Evaluation**: Evaluates quality using Grok or fallback logic
- **Storage**: Stores accepted questions in database
- **Images**: Generates charts/graphs for math questions

**Key Methods:**
```typescript
generateQuestions(options)     // Main entry point
evaluateQuestions(questions)   // Evaluate quality
storeQuestions(questions)      // Store in database
```

### API Layer (`unified-generate/route.ts`)

REST endpoint for web and programmatic access:
- **POST** `/api/admin/unified-generate` - Generate questions
- **GET** `/api/admin/unified-generate` - Get endpoint documentation

**Authentication**: Admin session or API key required

### CLI Layer (`generate-questions.js`)

Command-line interface for batch operations:
- Environment variable configuration
- Automatic retry logic
- Progress reporting
- Comprehensive statistics

## Examples

### Example 1: Basic Test Generation

```bash
# Generate a small batch for testing
MATH_COUNT=3 READING_COUNT=3 node generate-questions.js
```

**Output:**
```
📦 Batch 1/1
✅ Batch completed successfully!
   Generated: 6
   Evaluated: 6
   Accepted: 5
   Rejected: 1
   Stored: 5
   Duration: 45s
```

### Example 2: Production Batch Generation

```bash
# Generate 100 questions across 10 batches
MATH_COUNT=5 \
READING_COUNT=5 \
BATCH_COUNT=10 \
DELAY_MS=20000 \
TEMPERATURE=0.8 \
BASE_URL=https://production.com \
ADMIN_API_KEY=your-key \
node generate-questions.js
```

### Example 3: Specific Topic Generation

```bash
# Get topic ID from admin panel, then:
TOPIC_ID=clq1234567890 \
MATH_COUNT=20 \
READING_COUNT=0 \
node generate-questions.js
```

### Example 4: Programmatic with TypeScript

```typescript
import { unifiedQuestionGenerator } from '@/services/unifiedQuestionGenerator'

async function generateCustomQuestions() {
  const result = await unifiedQuestionGenerator.generateQuestions({
    mathCount: 10,
    readingCount: 0,
    difficulty: 'hard',
    temperature: 0.9,
    storeInDatabase: true,
    includeCharts: true,
  })

  console.log(`Generated ${result.summary.generated} questions`)
  console.log(`Accepted ${result.summary.accepted} questions`)
  console.log(`Stored ${result.summary.stored} questions`)

  // Access individual questions
  result.questions.accepted.forEach(q => {
    console.log(`- ${q.subtopic}: ${q.question.substring(0, 50)}...`)
  })
}
```

## Response Format

All generation methods return the same structured response:

```typescript
{
  summary: {
    generated: number    // Total questions generated
    evaluated: number    // Total questions evaluated
    accepted: number     // Questions accepted after evaluation
    rejected: number     // Questions rejected
    stored: number       // Questions stored in database
    needsReview: number  // Questions flagged for manual review
  },
  questions: {
    accepted: Array<{
      question: string
      moduleType: 'math' | 'reading-writing'
      difficulty: 'easy' | 'medium' | 'hard'
      category: string
      subtopic: string
      qualityScore: number
      explanation: string
      options: string[]
      correctAnswer: number
      points: number
      passage?: string
      chartDescription?: string
      evaluationFeedback: string
      needsReview: boolean
      storedId?: string    // Only if stored in database
    }>,
    rejected: Array<{
      question: string
      moduleType: string
      subtopic: string
      evaluationFeedback: string
    }>
  },
  storedQuestionIds?: string[]  // IDs of stored questions
}
```

## Quality Evaluation

Questions are evaluated based on:

1. **Difficulty Assessment** - Easy/Medium/Hard classification
2. **Quality Score** - 0-1 score based on:
   - Explanation quality
   - Option correctness
   - Question clarity
   - Chart/passage quality
3. **Acceptance** - Questions scoring ≥0.7 are accepted
4. **Feedback** - Detailed reasoning for the evaluation

### Fallback Evaluation

If Grok is unavailable, the system uses fallback logic:
- Points-based difficulty assessment
- Structural quality checks
- Module-specific bonuses
- Always provides useful feedback

Questions evaluated with fallback are flagged for manual review.

## Error Handling

The system includes robust error handling:

✅ **Automatic Retries** - Failed requests are retried automatically  
✅ **Graceful Degradation** - Fallback evaluation if Grok fails  
✅ **Detailed Logging** - All errors logged with context  
✅ **Partial Success** - Some failures don't stop entire batch  
✅ **Clear Messages** - User-friendly error messages  

## Monitoring & Debugging

### Enable Verbose Logging

Set `DEBUG=true` for detailed logs:
```bash
DEBUG=true node generate-questions.js
```

### Check Server Status

```bash
# Test endpoint availability
curl http://localhost:3000/api/admin/unified-generate
```

### Review Generated Questions

```bash
# View questions in database
npm run view:questions
```

### Check Question Stats

Navigate to `/admin/questions` to see:
- Total questions by module
- Questions needing review
- Quality score distributions
- Recent generations

## Migration from Old System

If you're migrating from the old generation system:

### Old API Endpoints
- ❌ `/api/admin/generate-questions` (simple)
- ❌ `/api/admin/enhanced-generate-questions` (enhanced)

### New API Endpoint
- ✅ `/api/admin/unified-generate` (all features)

### Old CLI Scripts
- ❌ `run-generation.js` (simple)
- ❌ `run-generation-enhanced.js` (enhanced)

### New CLI Script
- ✅ `generate-questions.js` (unified)

### Code Migration

**Before:**
```typescript
import { aiQuestionService } from '@/services/aiQuestionService'

const result = await aiQuestionService.generateAndStoreQuestions()
```

**After:**
```typescript
import { unifiedQuestionGenerator } from '@/services/unifiedQuestionGenerator'

const result = await unifiedQuestionGenerator.generateQuestions({
  storeInDatabase: true,
})
```

## Best Practices

### Development
- Start with small batches (3-5 questions)
- Use short delays (5-10 seconds)
- Test different configurations
- Review generated questions

### Production
- Use larger batches (10-20 questions)
- Add appropriate delays (15-30 seconds)
- Enable retry logic (3-5 attempts)
- Use API key authentication
- Monitor logs and statistics

### Quality Assurance
- Review flagged questions regularly
- Track acceptance rates over time
- Adjust AI temperature based on quality
- Use specific topic/subtopic filters
- Validate stored questions periodically

## Troubleshooting

### "Cannot connect to server"
- Ensure server is running: `npm run dev`
- Check BASE_URL is correct
- Verify network/firewall settings

### "Authentication required"
- For session auth: Log in to admin panel first
- For API key: Set ADMIN_API_KEY environment variable
- Check ADMIN_EMAILS in middleware configuration

### "Low acceptance rates"
- Adjust temperature (try 0.5-0.9)
- Increase max tokens if responses are cut off
- Check evaluation logic is working
- Review rejected question feedback

### "Slow performance"
- Increase delay between batches
- Reduce questions per batch
- Check server resources
- Verify network latency

## Support

For issues or questions:
1. Check this documentation
2. Review console logs for errors
3. Test with minimal configuration
4. File an issue on GitHub with logs

## Related Files

- `src/services/unifiedQuestionGenerator.ts` - Core service
- `src/app/api/admin/unified-generate/route.ts` - API endpoint
- `generate-questions.js` - CLI script
- `src/services/questionPromptTemplates.ts` - Prompt templates
- `src/services/promptConfig.ts` - AI configuration
