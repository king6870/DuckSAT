# Migration Guide: Old to Unified Question Generation System

This guide helps you transition from the old question generation system to the new unified system.

## Summary of Changes

The question generation system has been streamlined into a unified architecture:

### What Changed

**Old System** (Deprecated):
- ❌ `/api/admin/generate-questions` - Simple API endpoint
- ❌ `/api/admin/enhanced-generate-questions` - Enhanced API endpoint
- ❌ `run-generation.js` - Simple CLI script
- ❌ `run-generation-enhanced.js` - Enhanced CLI script
- ❌ `aiQuestionService.ts` - Multiple methods, inconsistent patterns

**New System** (Recommended):
- ✅ `/api/admin/unified-generate` - Single comprehensive API endpoint
- ✅ `generate-questions.js` - Unified CLI script with all features
- ✅ `unifiedQuestionGenerator.ts` - Clean, well-organized service

### What Stayed the Same

- All underlying AI models (GPT-5, Grok) remain unchanged
- Question structure and format remain the same
- Database schema remains unchanged
- Existing questions are not affected
- Old endpoints still work (backward compatible)

## Migration Steps

### For API Users

If you're calling the API endpoints directly:

**Before:**
```typescript
// Old simple endpoint
const response = await fetch('/api/admin/generate-questions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})

// Old enhanced endpoint
const response = await fetch('/api/admin/enhanced-generate-questions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    llmModel: 'gpt-5',
    questionCount: 10,
    mathCount: 5,
    readingCount: 5,
    temperature: 0.7,
    maxTokens: 4000,
    includeCharts: true,
    includePassages: true,
  })
})
```

**After:**
```typescript
// New unified endpoint
const response = await fetch('/api/admin/unified-generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mathCount: 5,
    readingCount: 5,
    temperature: 0.7,
    maxTokens: 4000,
    includeCharts: true,
    includePassages: true,
    storeInDatabase: true,  // New: control storage explicitly
    skipEvaluation: false,  // New: skip evaluation if needed
    moduleType: 'math',     // New: filter by module
    difficulty: 'hard',     // New: filter by difficulty
  })
})
```

**Key Differences:**
- No more `llmModel` parameter (always uses GPT-5)
- No more `questionCount` (use `mathCount` + `readingCount`)
- New `storeInDatabase` flag for explicit control
- New filtering options (`moduleType`, `difficulty`, `topicId`, `subtopicId`)
- Same response format with enhanced statistics

### For CLI Users

If you're using the command-line scripts:

**Before:**
```bash
# Old simple script
node run-generation.js

# Old enhanced script
BASE_URL=http://localhost:3000 \
QUESTION_COUNT=10 \
BATCH_COUNT=3 \
node run-generation-enhanced.js
```

**After:**
```bash
# New unified script
node generate-questions.js

# With options
BASE_URL=http://localhost:3000 \
MATH_COUNT=5 \
READING_COUNT=5 \
BATCH_COUNT=3 \
DIFFICULTY=hard \
node generate-questions.js
```

**Key Differences:**
- Single script for all functionality
- Use `MATH_COUNT` and `READING_COUNT` instead of `QUESTION_COUNT`
- More granular control with new environment variables
- Better progress reporting and statistics

### For Programmatic Users

If you're importing the service in your code:

**Before:**
```typescript
import { aiQuestionService } from '@/services/aiQuestionService'

// Simple generation
const result = await aiQuestionService.generateAndStoreQuestions()

// With settings
const result = await aiQuestionService.generateQuestionsWithSettings({
  llmModel: 'gpt-5',
  questionCount: 10,
  mathCount: 5,
  readingCount: 5,
  temperature: 0.7,
  maxTokens: 4000,
  includeCharts: true,
  includePassages: true,
})
```

**After:**
```typescript
import { unifiedQuestionGenerator } from '@/services/unifiedQuestionGenerator'

// Simple generation (with storage)
const result = await unifiedQuestionGenerator.generateQuestions({
  mathCount: 5,
  readingCount: 5,
  storeInDatabase: true,
})

// With all options
const result = await unifiedQuestionGenerator.generateQuestions({
  mathCount: 5,
  readingCount: 5,
  temperature: 0.7,
  maxTokens: 4000,
  includeCharts: true,
  includePassages: true,
  storeInDatabase: true,
  skipEvaluation: false,
  moduleType: 'math',
  difficulty: 'hard',
  topicId: 'clq...',
  subtopicId: 'clq...',
})
```

**Key Differences:**
- Import from `unifiedQuestionGenerator` instead of `aiQuestionService`
- Use `generateQuestions()` method with options object
- Explicit `storeInDatabase` flag
- Consistent response format

## Feature Comparison

| Feature | Old Simple | Old Enhanced | New Unified |
|---------|-----------|--------------|-------------|
| Generate questions | ✅ | ✅ | ✅ |
| Custom question counts | ❌ | ✅ | ✅ |
| Filter by module | ❌ | ✅ | ✅ |
| Filter by difficulty | ❌ | ✅ | ✅ |
| Filter by topic/subtopic | ❌ | ✅ | ✅ |
| Control AI temperature | ❌ | ✅ | ✅ |
| Control max tokens | ❌ | ✅ | ✅ |
| Skip evaluation | ❌ | ❌ | ✅ |
| Explicit storage control | ❌ | ❌ | ✅ |
| Batch operations | CLI only | CLI only | ✅ CLI |
| Retry logic | CLI only | ✅ | ✅ |
| Detailed statistics | ❌ | ✅ | ✅ |
| Progress reporting | Basic | ✅ | ✅ |

## Response Format

The new system provides a consistent response format across all interfaces:

```typescript
{
  summary: {
    generated: number      // Total questions generated
    evaluated: number      // Total questions evaluated
    accepted: number       // Questions accepted after evaluation
    rejected: number       // Questions rejected
    stored: number         // Questions stored in database
    needsReview: number    // Questions flagged for review
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
      storedId?: string      // If stored in database
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

This is compatible with the old enhanced endpoint response but adds more detail.

## Deprecation Timeline

### Current Status (Now)
- ✅ New unified system available and recommended
- ✅ Old endpoints still work (backward compatible)
- ⚠️ Old CLI scripts considered deprecated but functional

### Recommended Actions
1. **Immediate**: Test the new unified system alongside the old
2. **Short-term**: Migrate new code to use the unified system
3. **Medium-term**: Update existing code to use the unified system
4. **Long-term**: Old endpoints may be removed in a future major version

### No Breaking Changes
- Old endpoints will continue to work
- Existing code will not break
- Migration is optional but recommended

## Benefits of Migration

### For Developers
- ✅ Simpler API with fewer endpoints to remember
- ✅ More consistent interface across API/CLI/Code
- ✅ Better documentation and examples
- ✅ More granular control over generation
- ✅ Cleaner, more maintainable code

### For Operations
- ✅ Single CLI script to learn and maintain
- ✅ Better error handling and retry logic
- ✅ More detailed statistics and logging
- ✅ Easier to debug and troubleshoot

### For Everyone
- ✅ Consistent behavior across all access methods
- ✅ Better performance (optimized code paths)
- ✅ Future-proof (new features added to unified system)
- ✅ Comprehensive documentation

## Troubleshooting

### "Old endpoint works but new one fails"

Check authentication - the new endpoint requires admin authentication just like the old ones.

### "Different question quality"

The underlying AI models are the same. Any differences are due to:
- Different default parameters (check your options)
- Improved fallback evaluation logic (better quality assessment)

### "Can't find the new endpoint"

Make sure you've pulled the latest code:
```bash
git pull origin main
npm install
```

### "CLI script not found"

The new script is at the root level:
```bash
node generate-questions.js
```

Not in the scripts folder.

## Getting Help

For questions or issues:
1. Check `QUESTION_GENERATION.md` for full documentation
2. Review example usage in this guide
3. Test with minimal configuration
4. Check server logs for detailed error messages
5. File an issue on GitHub with reproduction steps

## Related Documentation

- `QUESTION_GENERATION.md` - Complete unified system documentation
- `AI_QUESTION_GENERATION.md` - Old system documentation (deprecated)
- `BATCH_GENERATION_GUIDE.md` - Old batch guide (deprecated)
- API documentation: `/api/admin/unified-generate` (GET for info)
