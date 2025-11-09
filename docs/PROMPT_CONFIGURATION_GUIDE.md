# AI Question Generation Prompt Configuration Guide

This guide explains how to customize and update the AI question generation prompts for the DuckSAT application.

## Overview

The AI question generation system has been refactored to centralize all prompt configuration and templates. This makes it easy for admins and maintainers to update prompt wording, adjust parameters, and maintain consistency across all question generation scenarios.

## File Structure

### 1. `src/services/promptConfig.ts`
Contains all configuration parameters used by the prompt templates.

**Key Configuration Sections:**

- **LLM_SETTINGS**: API call parameters
  - `DEFAULT_TEMPERATURE`: Controls randomness (0.7 default)
  - `DEFAULT_MAX_TOKENS`: Maximum response length (4000 default)
  - `EVALUATION_TEMPERATURE`: Lower temperature for evaluation (0.1)
  - `EVALUATION_MAX_TOKENS`: Token limit for evaluations (200)

- **PASSAGE_LIMITS**: Word count constraints for reading passages
  - `MIN_WORDS`: 150
  - `MAX_WORDS`: 300
  - `LONGER_MIN_WORDS`: 150
  - `LONGER_MAX_WORDS`: 400

- **DIFFICULTY_DISTRIBUTION**: Default percentages for question difficulty
  - `EASY`: 35%
  - `MEDIUM`: 45%
  - `HARD`: 20%

- **QUESTION_COUNTS**: Batch generation defaults
  - `DEFAULT_MATH`: 5 questions per batch
  - `DEFAULT_READING`: 5 questions per batch
  - `TARGET_PER_SUBTOPIC`: 100 questions
  - `BATCH_SIZE`: 5 questions

- **POINTS_BY_DIFFICULTY**: Point ranges for each difficulty level

- **CHART_REQUIREMENTS**: Visual element specifications
  - `TYPES`: List of acceptable chart/graph types
  - `CHART_DESCRIPTION_DETAILS`: Required information for chart descriptions
  - `GOOD_EXAMPLES`: Example chart descriptions

- **MATH_NOTATION_RULES**: Formatting guidelines for mathematical expressions

- **QUALITY_THRESHOLDS**: Quality assessment criteria
  - `MIN_EXPLANATION_LENGTH`: 50 characters
  - `REQUIRED_OPTIONS_COUNT`: 4 options
  - `MIN_QUESTION_LENGTH`: 20 characters
  - `ACCEPTANCE_THRESHOLD`: 0.6 quality score

- **SYSTEM_ROLES**: Role descriptions for AI models
  - `QUESTION_GENERATOR`: System role for generating questions
  - `EVALUATOR`: System role for evaluating questions

### 2. `src/services/questionPromptTemplates.ts`
Contains all prompt builder functions.

**Available Functions:**

- `buildMathQuestionsPrompt(subtopics, settings?)`: Generate math questions for multiple subtopics
- `buildReadingQuestionsPrompt(subtopics, settings?)`: Generate reading questions for multiple subtopics
- `buildMathSubtopicPrompt(subtopic, count)`: Generate math questions for a specific subtopic
- `buildReadingSubtopicPrompt(subtopic, count)`: Generate reading questions for a specific subtopic
- `buildEvaluationPrompt(question)`: Generate evaluation prompt for a question

### 3. `src/services/aiQuestionService.ts`
Main service that uses the prompt templates. No inline prompts remain - all prompt generation is delegated to the template functions.

## How to Update Prompts

### Changing LLM Parameters

Edit `src/services/promptConfig.ts`:

```typescript
export const LLM_SETTINGS = {
  DEFAULT_TEMPERATURE: 0.8,  // Increase for more creative responses
  DEFAULT_MAX_TOKENS: 5000,  // Allow longer responses
  // ...
}
```

### Adjusting Difficulty Distribution

Edit `src/services/promptConfig.ts`:

```typescript
export const DIFFICULTY_DISTRIBUTION = {
  EASY: 40,    // Increase easy questions
  MEDIUM: 40,  // Keep medium the same
  HARD: 20,    // Keep hard the same
}
```

### Modifying Chart Requirements

Edit `src/services/promptConfig.ts`:

```typescript
export const CHART_REQUIREMENTS = {
  TYPES: [
    'Your new chart type',
    // ... existing types
  ],
  GOOD_EXAMPLES: [
    'Your new example description',
    // ... existing examples
  ],
}
```

### Updating Math Notation Rules

Edit `src/services/promptConfig.ts`:

```typescript
export const MATH_NOTATION_RULES = {
  EQUATIONS: 'Your updated equation format guidelines',
  // ... other notation rules
}
```

### Customizing Prompt Templates

Edit `src/services/questionPromptTemplates.ts`:

```typescript
export function buildMathQuestionsPrompt(
  subtopics: SubtopicInfo[],
  settings?: GenerationSettings
): string {
  // Modify the prompt structure here
  return `
    Your customized prompt text...
  `
}
```

## Best Practices

1. **Test After Changes**: After modifying any configuration or template, run the test scripts:
   ```bash
   npm run test:ai-questions
   ```

2. **Maintain Consistency**: Keep prompt formatting consistent across all templates

3. **Update Examples**: When adding new requirements, include clear examples

4. **Document Changes**: Update this guide when making significant changes

5. **Version Control**: Commit configuration changes separately from code changes for easier rollback

## Prompt Quality Guidelines

### For Math Questions:
- Always include specific coordinate points, measurements, or data values
- Provide clear chart/graph descriptions with axis labels and scales
- Use proper mathematical notation as defined in MATH_NOTATION_RULES
- Include step-by-step explanations

### For Reading Questions:
- Ensure passages are within word count limits
- Vary passage types and topics
- Include clear evidence-based answer explanations
- Cover diverse subject areas (literature, science, history, social studies)

### For All Questions:
- Provide exactly 4 multiple choice options
- Use appropriate point values based on complexity
- Include detailed explanations for correct answers
- Match official SAT standards and difficulty levels

## Troubleshooting

### Issue: Generated questions are too easy/hard
**Solution**: Adjust `DIFFICULTY_DISTRIBUTION` or `POINTS_BY_DIFFICULTY` in promptConfig.ts

### Issue: Math questions lack visual elements
**Solution**: Review and update `CHART_REQUIREMENTS` in promptConfig.ts

### Issue: Passages are too long/short
**Solution**: Adjust `PASSAGE_LIMITS` in promptConfig.ts

### Issue: AI returns malformed JSON
**Solution**: Ensure `JSON_OUTPUT_INSTRUCTIONS` are included in all prompt templates

## Support

For questions or issues with prompt configuration:
1. Review this guide and the inline documentation in the source files
2. Check existing questions for examples of well-formatted output
3. Test changes incrementally to identify issues quickly
4. Consult the AI_QUESTION_GENERATION.md document for system overview
