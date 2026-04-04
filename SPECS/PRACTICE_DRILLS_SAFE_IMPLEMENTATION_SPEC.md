# Practice Drills Safe Implementation Spec

Status: Draft for implementation planning only
Owner: Product + Engineering
Date: 2026-04-03

## 1. Goal

Implement focused practice drills in a way that does not destabilize existing site behavior, data flows, or deployment reliability.

Success means:
- Users can start and complete topic drills with instant feedback.
- Drill data is recorded and visible in progress analytics.
- Existing core flows remain unchanged: home, auth, practice tests, admin, question review, pricing, and tracking.
- Rollout can be enabled/disabled quickly with minimal blast radius.

## 2. Current State (Research Summary)

Based on current code:
- Practice landing exists and routes users to category drills: src/app/practice/page.tsx.
- Category drill page exists with fixed 10-question flow and difficulty chooser: src/app/practice/[category]/page.tsx.
- Question fetch API already supports filters and count: src/app/api/questions/practice/route.ts.
- Drill result write endpoint exists and stores drill metadata in test results: src/app/api/practice/drill-results/route.ts.
- Progress API aggregates all test results and currently does not expose a dedicated drill overview object: src/app/api/progress/route.ts.
- Progress UI renders core metrics/history and does not include drill-specific summary sections: src/app/progress/page.tsx.
- Global nav currently includes Progress but not Practice: src/app/layout.tsx.

Implication:
- Foundations for drills are already present.
- Main risk is coupling drill changes too tightly with global progress behavior and navigation.
- Safe implementation should isolate drill-specific logic while preserving existing response contracts.

## 3. Non-Goals

- No redesign of full practice test system.
- No schema migration required for initial rollout.
- No changes to auth architecture.
- No breaking response contract changes for existing endpoints.
- No cross-cutting refactors in unrelated modules.

## 4. Safety Principles (Do Not Break Site)

1. Backward-compatible API contracts only.
2. Additive changes over mutating existing structures.
3. Feature-flagged UI exposure for drills enhancements.
4. Single-responsibility deltas per phase (small PRs).
5. Hard rollback path: disable feature flag and redeploy.

## 5. Architecture Plan (Safe)

### 5.1 Frontend Scope

Keep current drill page behavior stable and layer enhancements behind a flag:
- Optional drill length selector (default 10) on practice landing and drill setup.
- Preserve existing route patterns; pass optional query params only.
- If query params are absent/invalid, default to current behavior.

Containment:
- Only touch:
  - src/app/practice/page.tsx
  - src/app/practice/[category]/page.tsx
- Avoid shared hook rewrites, app-wide style rewrites, and unrelated component edits.

### 5.2 API Scope

For drill result persistence:
- Keep existing required fields valid.
- Make new fields optional (example: drillLength, sourceTag).
- Accept mixed module drills safely by allowing moduleType fallback handling.

For progress aggregation:
- Preserve existing JSON response shape.
- Add optional drillOverview object under data (additive only).
- Keep existing consumers working if they ignore new fields.

Containment:
- Only touch:
  - src/app/api/practice/drill-results/route.ts
  - src/app/api/progress/route.ts

### 5.3 Tracking Scope

- Reuse existing tracking helpers from src/lib/tracking.ts.
- Track drill lifecycle events in additive manner.
- Do not alter pageview/event batching internals for this feature.

## 6. Data Contract Additions (Additive)

## 6.1 Drill Results POST Body

Current required body remains supported:
- category
- moduleType
- difficulty
- results[]

Optional additions:
- drillLength: number (1..50)
- source: string ("topic-drill" | "quick-practice"), optional

Validation rules:
- If drillLength missing: default to results.length.
- If moduleType empty for mixed: normalize to "mixed" in metadata only.
- Never reject legacy payloads that were previously accepted.

## 6.2 Progress API Response

Add optional field:
- data.drillOverview

Proposed structure:
- totalDrills: number
- averageDrillScore: number
- drillsByLength: array of { length: number, attempts: number, avgScore: number }
- recentDrills: array (bounded small list)

Contract rule:
- Existing fields (overview, modulePerformance, categoryPerformance, etc.) must remain unchanged.

## 7. Rollout Plan (Phased)

### Phase 0: Preflight
- Confirm baseline build/lint health.
- Capture baseline API snapshots for:
  - /api/progress
  - /api/questions/practice
  - /api/practice/drill-results
- Confirm practice and progress pages render with no console/runtime errors.

Exit criteria:
- Baseline documented and reproducible.

### Phase 1: API Hardening (No UI Changes)
- Make drill-results endpoint tolerant of optional drill metadata.
- Add additive drillOverview in progress API.
- Keep behavior identical when metadata absent.

Exit criteria:
- Existing clients unaffected.
- New metadata accepted and surfaced.

### Phase 2: UI Enhancements Behind Feature Flag
- Add optional drill length selector.
- Keep default path at 10 questions when flag off or param missing.
- Track selected length in drill events.

Exit criteria:
- No nav/global layout regressions.
- Drill flow works for legacy and enhanced paths.

### Phase 3: Progress UI Additive Section
- Render drill overview cards only if drillOverview exists.
- Do not alter existing progress cards/charts semantics.

Exit criteria:
- Progress page still works for users with zero drills.
- New section degrades gracefully.

### Phase 4: Gradual Exposure
- Enable flag for internal/admin first.
- Then 10% user rollout, then 50%, then 100%.
- Monitor error rates and drill completion funnels each step.

Exit criteria:
- Stable metrics and no regressions in core flows.

## 8. Feature Flag Strategy

Flag name:
- NEXT_PUBLIC_ENABLE_DRILL_ENHANCEMENTS

When false:
- Current drill behavior remains unchanged.
- No drill-length UI shown.
- API remains compatible and safe.

When true:
- Enhanced drill controls visible.
- Additive drill analytics enabled.

## 9. Test Plan (Regression-First)

### 9.1 Automated
- Unit tests for request parsing/normalization in drill-results endpoint.
- Unit tests for progress API drillOverview aggregation.
- Integration test for practice -> drill -> save -> progress path.
- Contract tests asserting existing progress keys remain present.

### 9.2 Manual Smoke

Core non-drill smoke (must pass):
- Home page load.
- Auth sign-in path.
- Practice tests launch and submit.
- Admin pages load.
- Progress page load for user with historical data.

Drill smoke:
- Topic drill with default length.
- Topic drill with each enabled length.
- Mixed drill path.
- Weak-areas quick path.
- Drill completion persists and appears in progress.

### 9.3 Deployment Validation
- Push to ducksatweb.
- Confirm deployment success in Azure logs.
- Health checks:
  - /
  - /api/health
- Targeted page checks:
  - /practice
  - /practice/[category]
  - /progress

## 10. Monitoring and Guardrails

Track and alert on:
- 4xx/5xx rates for:
  - /api/practice/drill-results
  - /api/progress
  - /api/questions/practice
- Client-side errors on practice/progress routes.
- Drill start-to-complete conversion.
- Time to first question render.

Abort criteria (auto-rollback trigger):
- Significant increase in API 5xx.
- Progress page runtime failures.
- Authenticated users blocked from existing practice-test flow.

## 11. Rollback Plan

Fast rollback order:
1. Disable NEXT_PUBLIC_ENABLE_DRILL_ENHANCEMENTS.
2. Redeploy previous known-good commit if needed.
3. Verify /api/health and core pages.
4. Keep additive API compatibility in place unless proven harmful.

Data rollback:
- Not required for additive metadata fields.
- Ignore optional drill metadata in readers if temporary isolation needed.

## 12. PR Strategy

Create small, reviewable PRs in this order:
1. API compatibility and aggregation (no UI).
2. Drill UI controls behind flag.
3. Progress additive drill section.
4. Flag enablement and rollout config.

Each PR must include:
- Scope statement (what it touches, what it does not touch).
- Regression checklist results.
- Rollback instructions.

## 13. Acceptance Criteria

Functional:
- Users can run drills and get instant feedback.
- Drill completion is persisted.
- Progress includes drill analytics when available.

Safety:
- No breaking changes in existing API responses.
- No regression in full practice-test flow.
- No regression in auth, admin, and progress baseline functionality.

Operational:
- Feature can be disabled without code rollback.
- Deployment to ducksatweb remains healthy.

---

Implementation note:
This spec intentionally limits blast radius by isolating drill changes to known practice/progress surfaces and requiring additive, backward-compatible contracts.