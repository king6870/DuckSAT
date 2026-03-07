# SPEC: Specialized Topic Question Generation

## Scope
Files changed:
- `src/services/unifiedQuestionGenerator.ts`
- `scripts/test-specialized-topic-generation.ts`
- `package.json`

## Technical Design

### 1) GenerationOptions Extension
Add:
- `specializedMode?: boolean`

### 2) Generation Plan Abstraction
Add `GenerationPlan` interface and a public method:
- `buildGenerationPlan(options)`

Purpose:
- Normalize defaults.
- Execute subtopic selection logic without invoking LLM APIs.
- Enable deterministic test scripting.

### 3) Subtopic Selection Enforcement
Update internal `selectSubtopics` logic:
- Filter by `specificTopics` using both `topicId` and `topicName` (case-insensitive).
- Filter by `specificSubtopics` using both `id` and `name` (case-insensitive).
- If `specializedMode=true` and no explicit filters:
  - choose one random topic per active module,
  - sample selected subtopics only from that topic.

### 4) Pipeline Integration
`generateQuestions()` now calls `buildGenerationPlan()` at step 1, preserving all downstream behavior.

## Test Strategy

### Script Test
Add `scripts/test-specialized-topic-generation.ts`:
- Iterates all topics in `SAT_TOPICS`.
- Builds specialized plan per topic.
- Asserts selected subtopics:
  - are non-empty,
  - all belong to requested topic,
  - all match requested module type.
- Includes spot-check for `specificSubtopics` strictness.

### NPM Script
Add:
- `test:specialized-topics`

## Risks
- Topic-name filter collisions if names become non-unique.
- Random topic selection in specialized mode without filters can vary run-to-run (expected).

## Rollback
- Revert added option and plan method.
- Revert selection filter changes.
- Remove test script and npm script.

## Validation Commands
- `npm run test:specialized-topics`
- Existing generator tests / smoke paths as needed.
