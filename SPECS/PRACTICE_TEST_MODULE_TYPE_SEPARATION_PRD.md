# Product Requirements Document: Practice Test Module-Type Separation

## Objective
Ensure that each SAT practice test module contains only questions of its designated type:
- **Math module:** Only math questions
- **Reading/Writing module:** Only reading/writing questions

## Requirements

### 1. Module-Type Enforcement
- When assigning questions to practice tests:
  - **Math module** must contain only questions where `moduleType === 'math'`.
  - **Reading/Writing module** must contain only questions where `moduleType === 'reading-writing'`.
- No math questions should appear in reading modules, and vice versa.

### 2. Assignment Script Logic
- Filter available questions for each module by `moduleType` before assignment.
- Validate after assignment that all questions in each module match the module type.
- Log and throw errors if any mismatches are detected.

### 3. Database Consistency
- All questions in the database must have a valid `moduleType` field.
- Practice test assignment must respect this field.

### 4. Error Handling & Logging
- If insufficient questions of the required type are available, log a clear error and abort assignment.
- Log the count of available questions for each module type before assignment.
- Log any mismatches detected during validation.

### 5. Testing & Validation
- After assignment, run a validation script to ensure:
  - No math questions in reading modules
  - No reading questions in math modules
  - All modules have the correct number of questions
- Provide a summary log of assignment and validation results.

## Acceptance Criteria
- All practice tests contain only questions of the correct module type per module.
- No cross-type questions in any module.
- Assignment script aborts and logs errors if requirements are not met.
- Validation script confirms module-type separation for all practice tests.

---
**File:** SPECS/PRACTICE_TEST_MODULE_TYPE_SEPARATION_PRD.md
**Status:** Draft
**Author:** GitHub Copilot
**Date:** 2026-02-23
