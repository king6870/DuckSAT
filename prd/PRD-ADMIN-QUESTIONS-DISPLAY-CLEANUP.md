# PRD: Admin Questions Page — Diagram URL Display, Question ID, and Auto-Generated Cleanup

**Document Type:** Product Requirements Document  
**Feature ID:** ADMIN-QA-001  
**Author:** GitHub Copilot  
**Date:** 2026-03-03  
**Status:** Approved  

---

## 1. Overview

This PRD defines the product requirements for three enhancements to the Admin Questions Review Dashboard (`/admin/questions`):

1. **Question ID Display** — Surface the unique database ID on each question card so admins can reference questions in reports, bug tickets, and scripts.
2. **Diagram URL Display** — Show the `imageUrl` field (diagram/chart URL) as a visible, copyable link alongside the rendered image so admins can audit diagram sources.
3. **Delete Auto-Generated Questions** — Provide a one-click bulk action to permanently delete all questions whose text contains the string `"auto-generated"`, keeping the question bank free of placeholder or low-quality content.

---

## 2. Background & Motivation

| Pain Point | Impact |
|---|---|
| Admins must inspect browser DevTools or run SQL queries to find a question's ID | Slow review workflow, inconsistent bug reporting |
| `imageUrl` is never shown in the UI; admins cannot verify diagram sources | Diagram quality issues go unnoticed |
| Questions tagged or containing "auto-generated" clog the review queue and inflate counts | False review metrics, wasted admin time |

---

## 3. Goals

- **G1:** Every question card prominently shows its ID, enabling copy-on-click for quick reference.
- **G2:** When a question has a `diagramUrl` (`imageUrl`), the URL is rendered as a visible, truncated, clickable link below the diagram image.
- **G3:** A clearly labeled "Danger Zone" action with a confirmation dialog lets admins bulk-delete all auto-generated questions in one operation.
- **G4:** Zero regressions to existing review, filter, and pagination flows.

---

## 4. Non-Goals

- Editing `imageUrl` inline (out of scope; belongs to the question editor).
- Generating or replacing diagrams from this page.
- Soft-delete / archiving of auto-generated questions (hard delete is intentional; these are known garbage records).

---

## 5. User Stories

| Story ID | As a(n)... | I want to... | So that... |
|---|---|---|---|
| US-01 | Admin reviewer | See the question's database ID on the card | I can reference it in Jira tickets and Slack without leaving the page |
| US-02 | Admin reviewer | See the diagram URL as a clickable link | I can confirm the image is served from the correct CDN/storage bucket |
| US-03 | Admin | Delete all "auto-generated" questions at once | The review queue only contains real, meaningful questions |
| US-04 | Admin | Confirm before the bulk delete runs | I avoid accidentally deleting real questions |

---

## 6. Functional Requirements

### FR-01: Question ID Badge
- Display the question's `id` on every card in the header row.
- The ID should be partially truncated (first 8 characters) with a "copy to clipboard" affordance showing the full ID on click.
- Visually distinct from status badges (use a monospace, gray pill).

### FR-02: Diagram URL Display
- When `question.imageUrl` is non-null and non-empty, render a section below the diagram image (or as a standalone info row if no binary image exists) that shows:
  - A label "Diagram URL"
  - The URL truncated to ~60 characters with an ellipsis, fully visible on hover via `title` attribute
  - The URL wrapped in an `<a>` tag opening in a new tab
- This section must appear even when `imageData` is null (URL-only diagrams).

### FR-03: Delete Auto-Generated Questions
- A "Delete Auto-Generated Questions" button is placed in the **Danger Zone** card in the sidebar (below existing filters).
- On click, a browser `window.confirm()` dialog with the message: `"This will permanently delete all questions containing 'auto-generated'. This action cannot be undone. Continue?"` must be shown.
- On confirmation, the client calls `DELETE /api/admin/questions?filter=auto-generated`.
- A success message shows the count of deleted questions.
- The question list auto-refreshes after successful deletion.
- On failure, the existing error UI is reused.

### FR-04: API — DELETE endpoint
- `DELETE /api/admin/questions?filter=auto-generated`
- Auth: same admin check as GET/PATCH.
- Finds and permanently deletes all questions where `question` contains `"auto-generated"` (case-insensitive).
- Returns `{ deleted: number }`.

---

## 7. Acceptance Criteria

| Criterion | Verification |
|---|---|
| Every question card shows an ID badge | Manual review of `/admin/questions` |
| Copying the badge copies the full ID to clipboard | Click test in Chrome/Edge |
| `imageUrl` is shown as a link when present | Load a question with a known `imageUrl` |
| `imageUrl` section is hidden when `imageUrl` is null | Load a question without `imageUrl` |
| Clicking "Delete Auto-Generated" button shows confirm dialog | Manual test |
| Dismissing the dialog aborts the delete | Manual test |
| Confirming the dialog calls DELETE and shows count | Network tab inspection + UI message |
| Question list refreshes after deletion | Manual test |
| Existing filter, pagination, and review flows are unaffected | Regression smoke test |

---

## 8. Design Notes

- Keep styling consistent with existing Tailwind classes and gradients used in the page.
- The ID badge uses `font-mono text-xs` for readability.
- The Danger Zone card uses a red/rose border and background to signal destructiveness.
- Diagram URL uses a `text-blue-600 underline` link style.

---

## 9. Dependencies

| Dep | Details |
|---|---|
| Prisma `question.question` field | Case-insensitive contains filter using `mode: 'insensitive'` |
| Next.js 14 Route Handlers | `DELETE` method added to existing route file |
| Browser Clipboard API | For copy-ID functionality |

---

## 10. Timeline

| Milestone | Target |
|---|---|
| SPEC finalized | 2026-03-03 |
| Implementation | 2026-03-03 |
| QA Review | 2026-03-04 |
| Deploy to production | 2026-03-05 |
