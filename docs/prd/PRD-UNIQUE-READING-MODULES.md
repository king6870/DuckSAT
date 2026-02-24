# PRD: Unique Reading Questions Per Module in Practice Tests

## Problem Statement
Currently, modules 1 and 2 in SAT practice tests return the same set of reading questions. This results in duplicate questions for users, reducing the effectiveness and fairness of the practice test experience.

## Objective
Ensure that each module in a practice test (especially reading-writing modules 1 and 2) contains a unique set of questions, with no duplicates between modules.

## Requirements
- When creating or seeding a practice test, assign unique question IDs to each module.
- The backend must guarantee that no question appears in more than one module for the same practice test.
- The API response for `/api/practice-tests/[id]` must return distinct questions for each module.
- If there are not enough unique questions available, the system should return an error or warning.

## Acceptance Criteria
- [ ] Practice test modules 1 and 2 (reading-writing) contain only unique questions.
- [ ] No duplicate question IDs between modules for the same test.
- [ ] API returns correct, non-overlapping question sets for each module.
- [ ] Admin/seeding scripts enforce uniqueness when assigning questions.

## User Story
As a student, when I take a practice test, I want each module to have different questions so I can practice a wider range of material and avoid repetition.

## Technical Notes
- Update seeding/admin scripts to select unique questions per module.
- Add validation to prevent duplicate assignment.
- Test with API and UI to confirm correct behavior.

---
