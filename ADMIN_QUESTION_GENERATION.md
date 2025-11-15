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

## API Integration

### Endpoint

```
POST /api/admin/enhanced-generate-questions
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

## Batch Generation Script

### Overview

For automated batch generation, use the enhanced batch generation script located at the root of the repository: `run-generation-enhanced.js`

This script provides:
- **Automated batch processing** with configurable retry logic
- **Progress tracking** with detailed statistics
- **Error handling** and recovery
- **Flexible configuration** via environment variables
- **API key authentication** support for CI/CD pipelines

### Installation

The script requires Node.js and uses the existing dependencies. No additional installation needed.

### Configuration

Configure the script using environment variables:

#### Required Variables
- `BASE_URL` - Server URL (default: `http://localhost:3000`)

#### Authentication
- `ADMIN_API_KEY` - Optional API key for authentication (if not set, uses session auth)
  - To use API keys, set `ADMIN_API_KEYS` in your `.env` file (comma-separated list)
  - Example: `ADMIN_API_KEYS=key1,key2,key3`

#### Generation Settings
- `QUESTION_COUNT` - Questions per batch (default: 10, range: 1-50)
- `BATCH_SIZE` - Questions per request (default: 5, range: 1-10)
- `BATCH_COUNT` - Number of batches to run (default: 1)
- `DELAY_BETWEEN_BATCHES` - Milliseconds between batches (default: 15000)

#### Content Filters
- `MODULE_TYPE` - Filter by module: `math` or `reading-writing` (optional)
- `DIFFICULTY` - Filter by difficulty: `easy`, `medium`, or `hard` (optional)
- `TOPIC_ID` - Specific topic ID to generate for (optional)
- `SUBTOPIC_ID` - Specific subtopic ID to generate for (optional)

#### AI Settings
- `TEMPERATURE` - AI creativity (default: 0.7, range: 0-2)
- `MAX_TOKENS` - Max response length (default: 4000, range: 1000-8000)
- `INCLUDE_CHARTS` - Include charts/diagrams for math (default: true)
- `INCLUDE_PASSAGES` - Include passages for reading (default: true)

#### Reliability Settings
- `RETRY_ATTEMPTS` - Number of retry attempts on failure (default: 3)
- `RETRY_DELAY` - Milliseconds between retries (default: 5000)

### Usage Examples

#### Basic Usage (Local Development)
```bash
# Generate 10 questions with defaults
node run-generation-enhanced.js

# With custom settings
QUESTION_COUNT=20 BATCH_COUNT=3 node run-generation-enhanced.js
```

#### Math Questions Only
```bash
MODULE_TYPE=math QUESTION_COUNT=15 DIFFICULTY=hard node run-generation-enhanced.js
```

#### Production/CI Environment
```bash
# Using API key authentication
export BASE_URL=https://your-production-url.com
export ADMIN_API_KEY=your-secret-api-key
export QUESTION_COUNT=50
export BATCH_COUNT=5
export DELAY_BETWEEN_BATCHES=20000
node run-generation-enhanced.js
```

#### Specific Topic/Subtopic
```bash
# Generate for a specific subtopic
SUBTOPIC_ID=clq1234567 QUESTION_COUNT=25 node run-generation-enhanced.js
```

### Output

The script provides:
1. **Configuration summary** at startup
2. **Real-time progress** for each batch
3. **Detailed statistics** including:
   - Generated, evaluated, accepted, rejected counts
   - Storage success rate
   - Questions needing review
   - Total duration and average time per question
4. **Error reporting** with retry information
5. **Exit codes**: 0 for success, 1 for errors

### Batch Adapter Endpoint

The script uses a lightweight adapter endpoint at `/api/admin/batch-adapter` that supports both session-based and API key authentication.

#### Endpoint Features
- **Dual Authentication**: Supports both NextAuth sessions and API key tokens
- **Health Check**: GET request returns status and version info
- **Transparent Forwarding**: Routes requests to the main generation endpoint
- **Error Handling**: Robust error messages for debugging

#### API Key Setup
1. Add API keys to your `.env` file:
   ```
   ADMIN_API_KEYS=secret-key-1,secret-key-2
   ```
2. Use in requests:
   ```bash
   Authorization: Bearer secret-key-1
   ```

### Best Practices

#### For Development
1. Start with small batches (5-10 questions)
2. Use shorter delays (5-10 seconds)
3. Monitor output for issues
4. Test with different module types and difficulties

#### For Production
1. Use larger batches (20-50 questions)
2. Add appropriate delays (15-30 seconds) to avoid rate limiting
3. Enable retry logic (3-5 attempts)
4. Use API key authentication
5. Run during off-peak hours
6. Monitor logs and error rates

#### For Quality
1. Review questions marked for review regularly
2. Track acceptance rates across batches
3. Adjust temperature and max_tokens based on quality
4. Use topic/subtopic filters for targeted generation

### Troubleshooting

**Script fails to start:**
- Check Node.js is installed: `node --version`
- Verify you're in the project root directory
- Ensure dependencies are installed: `npm install`

**Authentication errors:**
- For local development: Make sure dev server is running and you're logged in
- For production: Verify `ADMIN_API_KEY` is set correctly
- Check `ADMIN_API_KEYS` is configured in `.env` file

**Connection errors:**
- Verify `BASE_URL` points to running server
- Check firewall and network settings
- Ensure server is accessible from script location

**Low acceptance rates:**
- Adjust `TEMPERATURE` (try 0.5-0.9)
- Increase `MAX_TOKENS` if responses seem truncated
- Check server logs for evaluation service issues
- Verify topic/subtopic filters are correct

**Performance issues:**
- Increase `DELAY_BETWEEN_BATCHES` to reduce load
- Reduce `QUESTION_COUNT` per batch
- Check server resources (CPU, memory)
- Review database connection pool settings

## Support

For issues or questions:
1. Check server logs at `/var/log/ducksat/`
2. Review this documentation
3. Contact system administrator
4. File an issue on the GitHub repository

## Future Enhancements

Planned improvements:
- [x] Enhanced batch generation script with error handling
- [x] API key authentication for automated scripts
- [ ] Bulk import from external sources
- [ ] Question difficulty prediction before generation
- [ ] Automatic question revision suggestions
- [ ] A/B testing different generation strategies
- [ ] Analytics dashboard for generation quality
- [ ] Multi-language support
- [ ] Custom prompt templates per subtopic
