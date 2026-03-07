# Technical Specification: Editable Question Index in Admin Question Manager

## 1. Objective
Enable admins to edit a persistent `questionIndex` value for each question directly from `admin/questions`, similar to ordered management workflows used in practice test tooling.

## 2. Scope
- Add nullable `questionIndex` field on `Question` model.
- Expose `questionIndex` in admin questions APIs.
- Add inline index editing control in admin question manager cards.
- Persist updates immediately to database.

## 3. Data Model
### Prisma
`Question.questionIndex Int?`

Semantics:
- `null`: unindexed question
- positive integer: explicit admin-defined index

## 4. API Changes
### GET `/api/admin/questions`
- Includes `questionIndex` in `select`.
- Orders by `questionIndex ASC`, then `createdAt DESC`.

### GET `/api/admin/questions/[id]`
- Includes `questionIndex` in returned question payload.

### PATCH `/api/admin/questions/[id]` (new)
Request body:
```json
{ "questionIndex": 12 }
```
or
```json
{ "questionIndex": null }
```
Validation:
- must be positive integer or null

Response:
```json
{
  "success": true,
  "question": {
    "id": "...",
    "questionIndex": 12
  }
}
```

## 5. UI Changes (`src/app/admin/questions/page.tsx`)
Per question card header:
- New `Index` pill with:
  - numeric input (`min=1`)
  - `Save` button
- Blank input saves as `null`.
- Invalid values trigger page error state.

## 6. Error Handling
- Server returns 400 for invalid index payload.
- Client surfaces error in existing global error panel.
- Save button shows transient loading state for the active card.

## 7. Migration / Deployment Notes
After pulling code:
1. Run Prisma migration (or db push) to add `questionIndex` column.
2. Run `npx prisma generate`.
3. Deploy API and frontend together.

## 8. Acceptance Criteria
- Admin can set index for a question and save successfully.
- Reload preserves saved index.
- Admin can clear index (save blank) and it persists as null.
- Questions list ordering respects index ascending, then recent creation date.
- No regression to existing search/filter/diagram functionality.
