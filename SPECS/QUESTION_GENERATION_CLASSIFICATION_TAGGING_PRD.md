# Product Requirements Document: SAT Question Generation, Classification, and Tagging

## Objective
- Generate 100 new reading-writing questions using the same generator as batch questions.
- For all questions (new and old), classify each as 'reading-writing' or 'math'.
- Add a tag to each question to ensure it stays in its appropriate module during assignment.

## Requirements

### 1. Question Generation
- Use the existing question generator (same as batch questions) to create 100 new reading-writing questions.
- Questions must be unique and meet SAT standards for reading-writing modules.

### 2. Classification
- For all questions in the database (new and old):
  - Review each question's content.
  - Classify as 'reading-writing' or 'math' based on content and structure.
  - Update the `moduleType` field accordingly.

### 3. Tagging
- Add a tag to each question:
  - For reading-writing questions: add tag `"reading-writing"`.
  - For math questions: add tag `"math"`.
- Tags must be stored in the `tags` field (JSON array).
- Ensure tags are used during assignment to enforce module separation.

### 4. Assignment Enforcement
- Assignment scripts must use both `moduleType` and tags to ensure questions are placed in the correct module.
- No cross-type questions allowed in any module.

### 5. Validation & Logging
- After classification and tagging, run a validation script:
  - Confirm all questions are correctly classified and tagged.
  - Log any mismatches or missing tags.
- Provide a summary report of classification and tagging results.

## Acceptance Criteria
- 100 new reading-writing questions generated and added to the database.
- All questions (new and old) are correctly classified and tagged.
- Assignment scripts enforce module separation using tags.
- Validation script confirms all questions are correctly classified and tagged.

---
**File:** SPECS/QUESTION_GENERATION_CLASSIFICATION_TAGGING_PRD.md
**Status:** Draft
**Author:** GitHub Copilot
**Date:** 2026-02-23
