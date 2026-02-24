# SPEC: SAT Question Generation, Classification, and Tagging

## 1. Generation
- Use the batch question generator script to create 100 new reading-writing questions.
- Questions must:
  - Be unique
  - Meet SAT reading-writing standards
  - Be stored in the database with `moduleType: 'reading-writing'`

## 2. Classification
- For all questions in the database:
  - Review content and structure
  - Set `moduleType` to 'math' or 'reading-writing' as appropriate
  - If ambiguous, default to 'reading-writing' only if it fits SAT standards

## 3. Tagging
- Add a tag to each question:
  - For math: add `"math"` to `tags` JSON array
  - For reading-writing: add `"reading-writing"` to `tags` JSON array
- Ensure tags are present and correct for all questions

## 4. Assignment Enforcement
- Assignment scripts must:
  - Filter by both `moduleType` and tag
  - Only assign questions to modules if tag matches module type

## 5. Validation
- Run a validation script:
  - Check all questions for correct `moduleType` and tag
  - Log any mismatches or missing tags
  - Provide summary report

## 6. Edge Cases
- If a question cannot be classified, log for manual review
- If tags are missing, add and log

---
**File:** SPECS/QUESTION_GENERATION_CLASSIFICATION_TAGGING_SPEC.md
**Status:** Draft
**Author:** GitHub Copilot
**Date:** 2026-02-23
