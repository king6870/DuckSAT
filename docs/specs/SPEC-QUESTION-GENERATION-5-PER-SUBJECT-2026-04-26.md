# SPEC: 5 Questions Per Subject + Generator Benchmark

Date: 2026-04-26
Owner: Copilot execution run

## 1. Goal
Generate SAT questions and return them for manual review, with a benchmark-backed choice of generator.

Primary outcome:
- 5 Math questions
- 5 Reading and Writing questions
- Full question dump shown to user for checking

## 2. Subjects Definition
For this run, subject means module type:
- Math -> moduleType = math
- Reading and Writing -> moduleType = reading-writing

## 3. Model Requirement
Use GPT-5-nano from environment configuration in .env.

Resolution rule:
- Prefer AZURE_OPENAI_DEPLOYMENT or DEPLOYMENT_NAME if set
- Fallback deployment name is gpt-5-nano

## 4. Candidate Generators to Benchmark
Candidate A (production pipeline):
- src/services/unifiedQuestionGenerator.ts
- 6-step pipeline with evaluation, retry, validation

Candidate B (legacy batch CLI):
- scripts/generate-sat-questions.ts
- batch generation and schema validation workflow

Out of scope for final selection:
- scripts/sat_unified_generator_v4.py (empty)
- scripts/sat_unified_generator_v3.py (incomplete/broken flow)

## 5. Benchmark Method
## 5.1 Test Size
Small-cost real run for each candidate:
- 2 Math + 2 Reading and Writing where possible

## 5.2 Scoring Criteria
Each candidate is scored on:
1. Completion reliability
- Requested vs generated count

2. Schema validity
- 4 options present
- valid correct answer index/label
- non-empty explanation
- non-empty question text

3. Subject compliance
- Reading and Writing includes passage
- Math remains math-oriented

4. Quality signal
- Use built-in quality score if available
- otherwise use structural and consistency checks

5. Runtime
- end-to-end completion time

## 5.3 Selection Rule
Pick generator with best combined reliability + validity + quality signal.
If tie, prefer production service path (UnifiedQuestionGenerator) because it is the active app pipeline.

## 6. Final Generation Plan
1. Run selected generator using GPT-5-nano configuration from .env
2. Generate exactly:
- 5 Math
- 5 Reading and Writing
3. Do not expose secrets from .env in output
4. Return all generated questions with:
- Subject
- Question
- Options A-D
- Correct answer
- Explanation
- Passage (for reading questions)

## 7. Success Criteria
Run is successful when:
- Benchmark result identifies a winner
- 10 questions are produced (5 per subject)
- Questions are shown in full for user review
- No secret leakage from environment values
