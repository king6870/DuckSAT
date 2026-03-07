# PRD: Specialized Topic Question Generation

## Overview
Enable the SAT question generator to create narrowly focused question sets for specific SAT topics/subtopics, with deterministic selection behavior and test coverage across all defined topics.

## Problem
The generator accepted `specificTopics` and `specificSubtopics` options but did not enforce them in subtopic selection. This made topic-specific generation unreliable and difficult to validate.

## Goals
1. Add true specialized generation mode.
2. Enforce topic and subtopic filters during planning.
3. Support deterministic testable planning without calling LLM APIs.
4. Add automated specialized tests for all SAT topics.

## Non-Goals
- Redesigning prompt templates.
- Replacing existing quality/evaluation pipeline.
- Changing DB schema.

## Functional Requirements
- FR1: `specializedMode` option added to generation options.
- FR2: `specificTopics` filter must select only subtopics from those topic IDs/names.
- FR3: `specificSubtopics` filter must select only those subtopic IDs/names.
- FR4: When specialized mode is enabled with no explicit topic/subtopic filter, choose one random topic per module and sample within it.
- FR5: Expose pre-generation plan API for validation (`buildGenerationPlan`) that does not require network/LLM.
- FR6: Add script test that validates specialized topic selection for all SAT topics.

## User Stories
- As an admin, I can generate only Algebra questions.
- As a content lead, I can generate only “Main Ideas and Central Claims” questions.
- As an engineer, I can test specialization behavior for every topic without LLM calls.

## Success Metrics
- 100% of specialized runs contain only requested topic/subtopic content.
- Test script passes for every topic in `SAT_TOPICS`.
- No regressions in existing generation pipeline.

## Acceptance Criteria
1. `specializedMode + specificTopics=[topic]` yields selected subtopics where all `topicId===topic`.
2. `specializedMode + specificSubtopics=[subtopic]` yields only that subtopic.
3. Existing generation flow still works when specialized mode is off.
4. `npm run test:specialized-topics` passes.
