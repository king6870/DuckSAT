# AI Question Generation System

## Overview

This system uses GPT-5 to generate SAT questions and Grok to evaluate them for difficulty and quality.

## Features

### Question Generation (GPT-5)
- **5 Math Questions** with graphs/charts/diagrams
- **5 Reading Questions** with passages (150-300 words)
- Each question includes:
  - Question text
  - 4 multiple choice options (A, B, C, D)
  - Correct answer
  - Points value (1-4 based on complexity)
  - Detailed explanation
  - Subtopic classification

### Question Evaluation (Grok)
- **Difficulty Assessment**: Classifies as easy/medium/hard
- **Quality Scoring**: 0-1 score for accuracy and appropriateness
- **Filtering**: Rejects questions that are too easy or too hard for SAT standards
- **Feedback**: Provides evaluation reasoning

## API Endpoints

### Generate Questions
```
POST /api/ai-questions/generate
```
Generates 10 new SAT questions and evaluates them.

**Response:**
```json
{
  "success": true,
  "summary": {
    "generated": 10,
    "evaluated": 10,
    "accepted": 8,
    "rejected": 2,
    "stored": 8
  },
  "questions": {
    "accepted": [...],
    "rejected": [...]
  }
}
```

### Get AI Questions
```
GET /api/ai-questions/generate
```
Returns statistics and recent AI-generated questions.

## Usage

### Web Interface
Navigate to `/test-ai-questions` to use the web interface for testing question generation.

### Command Line
```bash
npm run test:ai-questions
```

### Programmatic Usage
```typescript
import { aiQuestionService } from '@/services/aiQuestionService'

// Generate questions
const questions = await aiQuestionService.generateQuestions()

// Evaluate questions
const evaluated = await aiQuestionService.evaluateQuestions(questions)
```

## Configuration

The system uses these endpoints:
- **GPT-5**: `https://ai-manojwin82958ai594424696620.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview`
- **Grok**: `https://ai-manojwin82958ai594424696620.services.ai.azure.com/models`

## Question Structure

### Math Questions
```typescript
{
  question: "What is the value of x in the equation 2x + 5 = 13?",
  options: ["A) 2", "B) 4", "C) 6", "D) 8"],
  correctAnswer: 1,
  points: 2,
  explanation: "Solving for x: 2x + 5 = 13, 2x = 8, x = 4",
  moduleType: "math",
  category: "Algebra",
  subtopic: "Linear Equations and Inequalities",
  hasChart: true,
  chartDescription: "A coordinate plane showing the line y = 2x + 5"
}
```

### Reading Questions
```typescript
{
  question: "What is the main idea of the passage?",
  passage: "The Industrial Revolution transformed...",
  options: ["A) Technology improved", "B) Society changed", "C) Economy grew", "D) All of the above"],
  correctAnswer: 3,
  points: 2,
  explanation: "The passage discusses multiple aspects of transformation...",
  moduleType: "reading-writing",
  category: "Reading Comprehension",
  subtopic: "Main Ideas and Central Claims"
}
```

## Evaluation Criteria

Grok evaluates questions based on:

1. **Difficulty Match**: How well the question matches SAT difficulty standards
2. **Quality Score**: Overall accuracy, clarity, and appropriateness
3. **Acceptance**: Whether the question should be included in the question bank
4. **Feedback**: Specific reasoning for the evaluation

### Difficulty Levels
- **Easy**: Basic understanding, straightforward application
- **Medium**: Moderate complexity, requires analysis
- **Hard**: Advanced reasoning, complex problem-solving

### Quality Thresholds
- **Accept**: Quality score ≥ 0.7 and appropriate difficulty
- **Reject**: Quality score < 0.7 or inappropriate difficulty
- **Review**: Borderline cases that need human validation

## Database Storage

Accepted questions are automatically stored in the database with:
- Link to appropriate subtopic
- Difficulty classification from Grok
- Source marked as "AI Generated (GPT-5)"
- Automatic subtopic count updates

## Testing

### Quick Test
1. Navigate to `/test-ai-questions`
2. Click "Generate 10 SAT Questions"
3. Review the results

### Command Line Test
```bash
npm run test:ai-questions
```

This will generate questions and show detailed results in the console.

## Error Handling

The system includes robust error handling:
- API failures fall back to default evaluations
- Parsing errors are logged and skipped
- Database errors don't stop the generation process
- Network timeouts are handled gracefully

## Future Enhancements

1. **Batch Generation**: Generate larger batches of questions
2. **Custom Prompts**: Allow customization of generation prompts
3. **Human Review**: Interface for manual question review
4. **Analytics**: Track generation success rates and quality trends
5. **A/B Testing**: Compare different generation strategies
