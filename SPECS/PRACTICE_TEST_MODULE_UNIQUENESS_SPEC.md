# SPEC: SAT Practice Test Module Uniqueness

## Problem
In SAT Practice Test 1, the same exact questions are being assigned to both Module 1 and Module 2 for the Reading section. This violates the requirement that each module must contain a unique set of questions, with no overlap between modules.

## Goal
Ensure that SAT Practice Test 1 (and all future practice tests) assigns fully unique questions to each module within a section (e.g., Reading Module 1 and Reading Module 2), so that no question appears in more than one module.

## Requirements
1. **Module Uniqueness:**
   - Each module (e.g., Reading Module 1, Reading Module 2) must contain a unique set of questions.
   - No question may appear in more than one module within the same practice test.

2. **Global Uniqueness (Optional):**
   - If possible, ensure that questions are not repeated across modules in different practice tests.

3. **Assignment Logic:**
   - When assigning questions from batch files, track assigned questions for each module.
   - Exclude already assigned questions from subsequent module assignment.
   - If insufficient unique questions are available, log an error and skip assignment.

4. **Error Logging:**
   - Log detailed errors if duplicate questions are detected across modules.
   - Log assignment failures due to insufficient unique questions.

5. **Validation:**
   - After assignment, validate that all modules contain only unique questions.
   - Provide a summary of any detected overlaps or assignment errors.

## Implementation Steps
1. Update the assignment script to:
   - Track assigned questions per module.
   - Exclude already assigned questions from subsequent module assignment.
   - Log and handle errors for duplicate assignments.
2. Add post-assignment validation to check for overlaps.
3. Update documentation and logs to reflect uniqueness enforcement.

## Acceptance Criteria
- Practice Test 1 Reading Module 1 and Module 2 contain fully unique questions.
- No question is repeated across modules within a practice test.
- Assignment errors and overlaps are logged and reported.
- Assignment script and documentation are updated to enforce and validate module uniqueness.

---
**Date:** 2026-02-23
**Author:** GitHub Copilot
