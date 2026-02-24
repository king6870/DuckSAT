# Practice Test Unique Questions Spec

## Problem
Practice tests are currently assigning repeating questions, resulting in non-unique question sets for each test. This undermines the integrity of the practice test experience.

## Root Cause
- The script responsible for assigning questions does not enforce strict uniqueness across all practice tests.
- Questions may be reused due to insufficient filtering or shuffling logic.
- Database may not be checked for existing assignments before inserting new questions.

## Requirements
- Each practice test must contain 98 fully unique questions.
- No question should appear in more than one practice test.
- Questions must be distributed evenly across modules (e.g., math, reading-writing).
- Assignment must be robust against batch file changes and database updates.

## Solution Outline
1. Gather all available questions from batch files.
2. Remove duplicates by question text and ID.
3. For each practice test:
   - Remove all existing questions for that test.
   - Select 98 unique questions not assigned to any other test.
   - Assign 49 questions per module.
   - Insert into database, checking for uniqueness.
4. Add validation step to ensure no repeats across all tests.
5. Log and report any assignment errors or conflicts.

## Implementation Steps
- Update assignment script to enforce global uniqueness.
- Add database checks before insertion.
- Add post-assignment validation and logging.
- Test with multiple practice tests and batch files.

## Acceptance Criteria
- No question repeats across any practice test.
- Each test contains exactly 98 unique questions.
- Assignment is logged and validated.
- Solution works on localhost and in production.

---

**Status:** Draft
**Owner:** GitHub Copilot
**Last Updated:** 2026-02-23
