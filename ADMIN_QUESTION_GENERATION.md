# Admin Question Generation Guide

## Overview

The DuckSAT admin question generation system allows administrators to generate high-quality SAT questions using AI (GPT-5 for generation and Grok for evaluation). This guide explains how to use the system effectively.

## Access Requirements

Only users with admin privileges can access the question generation tools. Admin emails are configured in `/src/middleware/adminAuth.ts`.

## Accessing Question Generation

1. Navigate to the admin dashboard at `/admin`
2. Click on "AI Question Generation" or "Bulk Generation"
3. Or directly access `/admin/question-generation`

## Features

### 1. Topic/Subtopic Selection

**Topic Selection:**
- Choose a specific topic (e.g., "Algebra", "Reading Comprehension")
- Or select "All Topics" to generate across all available topics
- Topics are automatically filtered by module type (Math or Reading & Writing)

**Subtopic Selection:**
- Once a topic is selected, you can narrow down to specific subtopics
- Each subtopic shows current question count vs. target (e.g., 45/100)
- Or select "All Subtopics" to generate across all subtopics in the topic

### 2. Module Type Filter

- **Both Math & Reading:** Generate questions from both modules (default)
- **Math Only:** Generate only math questions with charts/diagrams
- **Reading & Writing Only:** Generate only reading questions with passages

Note: If you select a topic, the module type is automatically set based on that topic.

### 3. Difficulty Level

Choose the difficulty level for generated questions:
- **All Difficulties:** Mix of easy, medium, and hard questions
- **Easy:** Basic understanding, straightforward application
- **Medium:** Moderate complexity, requires analysis
- **Hard:** Advanced reasoning, complex problem-solving

### 4. Question Count Configuration

**Total Questions:** Set the total number of questions to generate (1-50)

**Math/Reading Split:** 
- Automatically splits evenly by default
- Can be manually adjusted to focus on specific module types
- Example: 10 total → 5 Math, 5 Reading (default)

### 5. Advanced Settings

**Temperature (0-2):**
- Lower values (0.3-0.7): More focused, deterministic output
- Higher values (0.8-1.5): More creative, varied output
- Default: 0.7

**Max Tokens:**
- Controls the length of generated content
- Default: 4000 tokens
- Range: 1000-8000

**Options:**
- ✅ Include charts/diagrams (Math questions)
- ✅ Include passages (Reading questions)

## Generation Process

When you click "Generate Questions," the system:

1. **Initializes** the AI services
2. **Generates** questions using GPT-5 based on your settings
3. **Evaluates** each question using Grok for quality and difficulty
4. **Accepts/Rejects** questions based on evaluation scores
5. **Stores** accepted questions in the database
6. **Marks for Review** questions that used fallback evaluation

## Understanding Results

### Summary Statistics

- **Generated:** Total questions created by AI
- **Evaluated:** Questions that passed through evaluation
- **Accepted:** Questions that met quality standards
- **Rejected:** Questions that didn't meet standards
- **Stored:** Questions successfully saved to database
- **Needs Review:** Questions marked for manual review

### Question Status Indicators

**✅ Accepted Questions:**
- Green border
- Passed evaluation with good quality scores
- Ready to use immediately

**⚠️ Needs Review:**
- Yellow/orange border with warning icon
- Used fallback evaluation logic
- Should be manually reviewed before use
- Automatically marked with `reviewStatus: 'pending'`

### Per-Question Information

Each question display shows:
- **Module Type:** Math or Reading & Writing
- **Difficulty:** Easy, Medium, or Hard
- **Category & Subtopic:** Hierarchical classification
- **Quality Score:** Percentage (0-100%)
- **Evaluation Feedback:** Why the question was accepted/rejected
- **Database Status:** Whether it was stored successfully

## Fallback Evaluation Warning

**What is Fallback Evaluation?**
When the Grok evaluation service is unavailable or fails, the system uses an enhanced fallback evaluation algorithm based on:
- Point values
- Content length and structure
- Presence of explanations and options
- Chart/passage quality

**Why It Needs Review:**
Fallback-evaluated questions are marked with `reviewStatus: 'pending'` because:
- They haven't been validated by the primary AI evaluator
- Quality assessment is based on heuristics, not deep analysis
- May need human verification for accuracy and appropriateness

**What to Do:**
1. Review all questions marked with ⚠️ warning
2. Navigate to `/admin/questions` to see all questions
3. Filter by `reviewStatus: 'pending'`
4. Manually approve or edit each question
5. Update `reviewStatus` to 'approved' or 'rejected'

## Error Handling

### Common Errors

**"Admin access required"**
- You are not logged in with an admin account
- Check that your email is in the admin list

**"Invalid topic ID" / "Invalid subtopic ID"**
- The selected topic/subtopic doesn't exist in the database
- Try refreshing the page or selecting a different option

**"Failed to generate questions"**
- AI service timeout or API error
- Check network connectivity
- Verify API keys are configured in environment variables

**"Failed to store question"**
- Database connection issue
- Referential integrity error (subtopic doesn't exist)
- Check server logs for details

### Viewing Errors

All errors are displayed in the UI with:
- Clear error message
- Detailed information (when available)
- "Try Again" button to retry generation

## Best Practices

### 1. Start Small
- Begin with 5-10 questions to test settings
- Increase count once you're satisfied with quality

### 2. Use Topic/Subtopic Filters
- Target specific areas that need more questions
- Check current counts to see where coverage is low

### 3. Review Fallback Questions
- Always review questions with fallback evaluation
- These are safe to use but benefit from human verification

### 4. Monitor Quality Scores
- Aim for questions with 70%+ quality scores
- Questions below 60% may need editing

### 5. Difficulty Distribution
- Mix difficulty levels for comprehensive coverage
- Use difficulty filters for targeted generation

## Batch Generation Script

### Enhanced Script (`run-generation-enhanced.js`)

The enhanced batch generation script provides a robust command-line tool for automated question generation with retry logic, timeouts, and detailed logging.

#### Features

- **Configurable via environment variables** - No code changes needed
- **Retry logic with exponential backoff** - Handles transient failures
- **Timeout support** - Prevents hanging requests
- **Health checks** - Verifies server availability before starting
- **Jittered intervals** - Reduces server load spikes
- **JSON output** - Saves detailed results to a file
- **Progress tracking** - Real-time console feedback

#### Usage

```bash
# Set environment variables (optional, uses defaults if not set)
export BASE_URL=http://localhost:3000
export ADMIN_API_KEY=your-secret-key  # Required in production
export GENERATION_ENDPOINT=/api/admin/enhanced-generate-questions
export ITERATIONS=10
export QUESTIONS_PER_CALL=10
export INTERVAL_MS=15000
export RETRIES=3
export TIMEOUT_MS=30000
export OUTPUT_FILE=generation-results.json

# Additional generation settings
export LLM_MODEL=gpt-5
export TEMPERATURE=0.7
export MAX_TOKENS=4000
export INCLUDE_CHARTS=true
export INCLUDE_PASSAGES=true

# Run the script
node run-generation-enhanced.js
```

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Server base URL |
| `ADMIN_API_KEY` | `null` | Admin API key (sent as `Authorization: Bearer <key>`) |
| `GENERATION_ENDPOINT` | `/api/admin/enhanced-generate-questions` | API endpoint to call |
| `ITERATIONS` | `10` | Number of generation cycles |
| `QUESTIONS_PER_CALL` | `10` | Questions to generate per cycle |
| `INTERVAL_MS` | `15000` | Base wait time between cycles (ms) |
| `RETRIES` | `3` | Retry attempts per failed request |
| `TIMEOUT_MS` | `30000` | Request timeout (ms) |
| `OUTPUT_FILE` | `generation-results.json` | Results output file |
| `LLM_MODEL` | `gpt-5` | LLM model to use |
| `TEMPERATURE` | `0.7` | Generation temperature (0-2) |
| `MAX_TOKENS` | `4000` | Max tokens per generation |
| `INCLUDE_CHARTS` | `false` | Include charts in math questions |
| `INCLUDE_PASSAGES` | `true` | Include passages in reading questions |

#### Output Format

The script creates a JSON file with detailed results:

```json
{
  "iterations": 10,
  "generated_total": 95,
  "accepted_total": 82,
  "failed": 1,
  "results": [
    {
      "iteration": 1,
      "ok": true,
      "generated": 10,
      "accepted": 8,
      "raw": { ... }
    },
    {
      "iteration": 2,
      "ok": false,
      "error": "HTTP 502: Bad Gateway",
      "status": 502,
      "response": { ... }
    }
  ]
}
```

#### Exit Codes

- `0` - All iterations succeeded
- `1` - Fatal error (couldn't start)
- `2` - Some iterations failed (check results file)

## API Integration

### Endpoint

```
POST /api/admin/enhanced-generate-questions
```

This endpoint provides authenticated access to the question generation service. It acts as an adapter that validates admin credentials and forwards requests to the internal generation service with retry and timeout logic.

### Authentication

The endpoint supports optional API key authentication:

- **Development**: If `ADMIN_API_KEY` is not set, requests are allowed (for easier local testing)
- **Production**: Set `ADMIN_API_KEY` environment variable to require authentication

When `ADMIN_API_KEY` is set, include it in requests:

```bash
Authorization: Bearer your-secret-key
```

### Request Body

```json
{
  "llmModel": "gpt-5",
  "questionCount": 10,
  "mathCount": 5,
  "readingCount": 5,
  "temperature": 0.7,
  "maxTokens": 4000,
  "includeCharts": true,
  "includePassages": true,
  "topicId": "optional-topic-id",
  "subtopicId": "optional-subtopic-id",
  "moduleType": "math",
  "difficulty": "medium"
}
```

### Response

```json
{
  "success": true,
  "summary": {
    "generated": 10,
    "evaluated": 10,
    "accepted": 8,
    "rejected": 2,
    "stored": 8,
    "needsReview": 2
  },
  "questionResults": [
    {
      "id": "question-id",
      "status": "stored",
      "needsReview": true,
      "evaluationFeedback": "Fallback evaluation - evaluator unavailable"
    }
  ],
  "questions": {
    "accepted": [...],
    "rejected": [...]
  }
}
```

### Environment Variables for Endpoint

Configure the endpoint behavior:

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_API_KEY` | `null` | Required for authenticated access (optional in dev) |
| `ENHANCED_GENERATION_RETRIES` | `2` | Number of retry attempts |
| `ENHANCED_GENERATION_TIMEOUT_MS` | `30000` | Request timeout in milliseconds |
| `NEXT_PUBLIC_BASE_URL` or `BASE_URL` | Host header | Base URL for internal forwarding |

### Error Responses

**401 Unauthorized** - Missing or invalid API key (when `ADMIN_API_KEY` is set)
```json
{
  "error": "Unauthorized. Missing or invalid Authorization header."
}
```

**405 Method Not Allowed** - Non-POST request
```json
{
  "error": "Method not allowed"
}
```

**502 Bad Gateway** - Generation service unavailable
```json
{
  "error": "Failed to reach generation service",
  "message": "Error details"
}
```

## Database Schema

Questions are stored with these fields:

```typescript
{
  id: string
  subtopicId: string | null
  moduleType: 'math' | 'reading-writing'
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  subtopic: string
  question: string
  passage: string | null
  options: string[]
  correctAnswer: number
  explanation: string
  imageUrl: string | null
  imageAlt: string | null
  chartData: JSON | null
  timeEstimate: number
  source: string
  tags: string[]
  isActive: boolean
  reviewStatus: 'pending' | 'approved' | 'rejected' | null
  reviewComments: string | null
  createdAt: DateTime
  updatedAt: DateTime
}
```

## Reviewing Generated Questions

### Access Review Interface

1. Navigate to `/admin/questions`
2. Filter by `reviewStatus: 'pending'`
3. Review each question individually

### Review Checklist

- [ ] Question text is clear and unambiguous
- [ ] All options are plausible
- [ ] Correct answer is actually correct
- [ ] Explanation is accurate and helpful
- [ ] Difficulty level seems appropriate
- [ ] Charts/diagrams are described correctly (if applicable)
- [ ] No typos or grammatical errors

### Approval Process

1. Click "Edit" on a question
2. Make any necessary corrections
3. Update `reviewStatus` to 'approved'
4. Save changes

## Troubleshooting

### Questions Not Appearing

1. Check database connection
2. Verify subtopic exists in database
3. Check server logs for storage errors
4. Ensure `isActive` is set to true

### Low Quality Scores

1. Increase temperature for more varied output
2. Try different topic/subtopic combinations
3. Adjust max tokens if responses are truncated
4. Check that evaluation service is working

### Fallback Evaluation Always Used

1. Verify Grok API endpoint is accessible
2. Check API keys are correctly configured
3. Review network connectivity
4. Check rate limits haven't been exceeded

## Support

For issues or questions:
1. Check server logs at `/var/log/ducksat/`
2. Review this documentation
3. Contact system administrator
4. File an issue on the GitHub repository

## Future Enhancements

Planned improvements:
- [ ] Bulk import from external sources
- [ ] Question difficulty prediction before generation
- [ ] Automatic question revision suggestions
- [ ] A/B testing different generation strategies
- [ ] Analytics dashboard for generation quality
- [ ] Multi-language support
- [ ] Custom prompt templates per subtopic
