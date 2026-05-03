# Technical Specification: Unified Text + LaTeX Rendering Across All Question Surfaces

Issue: Rendering consistency and LaTeX fidelity across test, drills, and web views
Status: Draft
Author: Copilot
Date: 2026-04-27

## 1. Goal
Guarantee that all question content (plain text and LaTeX) renders correctly and consistently everywhere a question appears.

Primary outcomes:
- No raw LaTeX artifacts shown to users (for example `\\sqrt`, stray `$`, mixed escaped slashes)
- All question fields render consistently across test, drill, admin, review, and exported web surfaces
- One shared canonical normalization + rendering contract used by all clients

## 2. Problem Statement
Current behavior is fragmented:
- Some surfaces use `MathRenderer` (KaTeX/react-katex)
- Some surfaces use MathJax with `dangerouslySetInnerHTML`
- Some static export flows render raw HTML text without shared math normalization

This causes inconsistent user output such as:
- `2\\sqrt{2}` shown literally instead of rendered math
- Some fields require `$...$` while others rely on ad-hoc parsing
- Inconsistent behavior between practice test, topic drills, admin review, and exported HTML

## 3. In Scope
- Question text, passage, options, explanation, wrong-answer explanations, chart descriptions, and image alt text
- All question-facing surfaces:
  - Topic drill: `src/app/practice/[category]/page.tsx`
  - Practice test: `src/app/practice-test/page.tsx`
  - Question library web view: `src/app/questions/page.tsx`
  - Group study: `src/app/group-study/[sessionId]/page.tsx`
  - Admin/test pages currently rendering question content
  - Exported HTML flows
- Server-side question payload normalization for all question APIs
- Rendering reliability tests (unit + integration snapshots)

## 4. Out of Scope
- Rewriting question-generation prompt strategy
- Visual redesign of question cards
- Non-question text rendering in unrelated marketing pages

## 5. Architecture Decision
Adopt one canonical rendering pipeline for all question content.

5.1 Canonical Content Contract (API)
- API responses MUST send normalized string content for all renderable fields
- Normalization rules:
  1. HTML entities decoded once
  2. Backslash normalization for LaTeX commands (`\\\\` -> `\\` where appropriate)
  3. Preserve plain text, punctuation, and spacing semantics
  4. Do not inject raw HTML fragments in question fields

5.2 Canonical Renderer Contract (Client)
- All question surfaces MUST render through a single shared renderer component and helper utilities
- No question field may bypass the renderer with direct `dangerouslySetInnerHTML`
- Renderer must support:
  - Plain text only
  - Inline LaTeX with delimiters (`$...$`, `\\(...\\)`)
  - Display LaTeX (`$$...$$`, `\\[...\\]`)
  - Mixed plain text + LaTeX
  - LaTeX-like text lacking delimiters (auto-wrap heuristic for safe inline rendering)

5.3 Static/Export Surface Contract
- Export scripts must use the same normalization rules as APIs
- Exported HTML must include math runtime and render pass with the same delimiter policy

## 6. Required Refactor Targets
6.1 Core renderer and helpers
- `src/components/MathRenderer.tsx`
- New shared utility module (recommended): `src/lib/math/normalizeMathText.ts`
- New shared utility module (recommended): `src/lib/math/mathDetection.ts`

6.2 API normalization entry points
- `src/app/api/questions/route.ts`
- `src/app/api/questions/practice/route.ts`
- `src/app/api/practice-tests/[id]/route.ts`
- Any API returning question payloads for UI rendering

6.3 Client surfaces to converge on shared renderer
- `src/app/practice/[category]/page.tsx`
- `src/app/practice-test/page.tsx`
- `src/app/questions/page.tsx`
- `src/app/group-study/[sessionId]/page.tsx`
- `src/components/ComprehensiveQuestionDisplay.tsx`
- `src/components/InteractiveMathQuestion.tsx`
- `src/components/ReviewCard.tsx`

6.4 Legacy pages to remove direct HTML math injection
- `src/app/admin/questions/page.tsx`
- `src/app/review/page.tsx`

6.5 Export scripts
- `scripts/export-questions-with-diagrams-interactive.ts`
- Any other HTML export scripts that output question content

## 7. Normalization Rules (Spec)
Input examples and expected canonical output:

1. Doubled slash LaTeX
- Input: `2\\\\sqrt{2}`
- Canonical: `2\\sqrt{2}`

2. Already-delimited inline math
- Input: `A) $2\\sqrt{2}$`
- Canonical: unchanged

3. Non-delimited LaTeX token in option
- Input: `B) 2\\sqrt{2}`
- Canonical for rendering: `B) $2\\sqrt{2}$`

4. Plain text containing backslash not math command
- Input: `Path C:\\Users\\name`
- Canonical: unchanged as plain text

5. HTML entity content
- Input: `x &lt; y &amp; y &gt; 0`
- Canonical: `x < y & y > 0`

Heuristic safety:
- Auto-wrap math only when command patterns are detected (`\\sqrt`, `\\frac`, `\\pi`, `\\theta`, etc.) and no explicit delimiters are present
- Never auto-wrap entire paragraphs blindly

## 8. Rendering Invariants
These must hold in all environments:
- Invariant 1: No visible raw `\\sqrt`, `\\frac`, `\\triangle` tokens unless explicitly escaped as literal code
- Invariant 2: No visible orphan `$` delimiters in rendered UI
- Invariant 3: Option labels (A/B/C/D) remain outside math expression where possible
- Invariant 4: Same source text renders identically in drill/test/admin/export
- Invariant 5: Screen reader label generation does not strip semantic meaning

## 9. Testing Strategy
9.1 Unit tests
- Normalize helper fixtures for edge cases:
  - doubled slashes
  - mixed text + latex
  - malformed delimiters
  - windows paths and non-math backslashes

9.2 Component tests (renderer)
- Snapshot tests for mixed content rendering
- Golden cases for options like `B) 2\\sqrt{2}`

9.3 API tests
- Contract tests ensuring normalized payload from each question API

9.4 End-to-end tests
- Drill flow question + options + explanation rendering
- Practice test rendering parity
- Question library rendering parity
- Admin review rendering parity
- Exported HTML visual smoke test

## 10. Rollout Plan
Phase 1: Shared normalization utility
- Build and test normalization + detection helpers

Phase 2: Renderer hardening
- Refactor `MathRenderer` to consume shared helpers and deterministic parsing

Phase 3: API convergence
- Apply normalization to all question APIs

Phase 4: Surface migration
- Remove legacy `dangerouslySetInnerHTML` math paths
- Route all question fields through shared renderer

Phase 5: Export parity
- Ensure export script uses same normalization and render rules

Phase 6: Verification and guardrails
- Add CI tests for known regressions (`\\sqrt`, orphan `$`)

## 11. Observability and QA Gates
- Add a lightweight render-quality counter for detected fallback renders (where parsing fails)
- Log normalization anomalies at debug level in non-production
- Release gate: zero critical render regressions on agreed fixture set

## 12. Acceptance Criteria
- AC1: All question surfaces render known LaTeX fixtures correctly
- AC2: No raw doubled-slash LaTeX tokens visible in UI/export output
- AC3: No user-facing stray dollar signs from math delimiters
- AC4: Legacy MathJax/dangerouslySetInnerHTML render paths for question fields are removed or isolated behind shared renderer output
- AC5: CI includes normalization and rendering regression tests for representative SAT question corpus

## 13. Open Questions
- Should math rendering standardize on KaTeX only, or keep MathJax on specific legacy pages?
- Should DB content be backfilled to canonical slash format, or normalize only at API boundary?
- Should we annotate fields with explicit `contentFormat` metadata (`plain`, `latex`, `mixed`) for deterministic rendering?

## 14. Recommended Next Step
Create and approve a migration PR that introduces shared normalization helpers and migrates one vertical slice first:
- `GET /api/questions/practice`
- `src/app/practice/[category]/page.tsx`
- `scripts/export-questions-with-diagrams-interactive.ts`

Then extend to practice tests and admin/review surfaces.
