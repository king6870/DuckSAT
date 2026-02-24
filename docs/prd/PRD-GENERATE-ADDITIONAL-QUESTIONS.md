# PRD: Generate Additional Questions for Practice Test Seeding

## Problem Statement
The practice test seeding script fails due to insufficient unreserved questions in certain categories and difficulty levels (e.g., rhetoric, reading-writing, hard). This prevents the creation of full-length practice tests with unique questions per module.

## Objective
Automatically generate and insert additional questions into the database to ensure all modules and categories have enough questions to meet the required distribution for practice test seeding.

## Requirements
- Identify categories and difficulty levels with insufficient questions.
- Generate new questions for each missing category/difficulty.
- Insert generated questions into the database, marking them as active and unreserved.
- Ensure the total number of questions meets or exceeds the seeding script requirements.
- Rerun the seeding script to confirm successful practice test creation.

## Acceptance Criteria
- [ ] All modules in practice tests are seeded with the required number of unique questions.
- [ ] No seeding errors due to insufficient questions.
- [ ] New questions are visible and accessible in the database.
- [ ] Practice tests contain balanced and unique question sets.

## User Story
As an admin, I want the system to automatically generate and insert missing questions so that practice tests can always be seeded with the required distribution and no duplicates.

## Technical Notes
- Use a question generation function or template for each category/difficulty.
- Insert questions using Prisma or direct SQL.
- Validate after insertion that all requirements are met.

---
