# PRP: Editable Question Index for Admin Question Manager

## Product Request
Admins need to assign and update a persistent index for questions directly in question management, similar to how ordered question workflows are handled in practice test management.

## Problem
Today, admin questions can be reviewed and filtered, but there is no direct per-question index field editable in the UI. This blocks deterministic ordering and manual curation workflows.

## Goals
- Provide a simple, fast inline way to set question index values.
- Persist values to database.
- Keep behavior consistent with existing admin UX patterns.

## Non-Goals
- Bulk index editing in this phase.
- Drag-and-drop reordering in this phase.
- Public/student-facing usage of question index in this phase.

## User Story
As an admin, I can edit and save a question’s index in the question manager, so I can curate and control ordering with precision.

## Functional Requirements
1. Each question card displays an editable numeric index control.
2. Save operation persists index to database.
3. Blank value clears index to null.
4. Validation enforces positive integers.
5. Question listing honors index ordering when present.

## Technical Plan
- Add `questionIndex Int?` on `Question`.
- Extend admin list and item APIs to read/write `questionIndex`.
- Add PATCH endpoint for focused index updates.
- Add inline input + Save button in admin page.

## Success Metrics
- 100% of index edits persist correctly after refresh.
- No increase in admin page runtime errors.
- Admins can complete index edit in <= 2 interactions.

## Risks
- Schema migration not applied in target environment.
- Concurrent admin edits on same question index.

## Rollout
1. Ship backend + frontend.
2. Run migration and regenerate Prisma client.
3. Verify on admin page with save/refresh flow.
