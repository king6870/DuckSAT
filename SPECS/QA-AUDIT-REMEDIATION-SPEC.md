# QA Audit Remediation Spec

## Goal

Resolve the confirmed production issues from the live QA pass without changing deployment state or pushing to git.

## Confirmed Defects In Scope

1. Non-admin users can access `/admin`.
2. Non-admin users can access `/admin/practice-tests`.
3. Authenticated students are redirected away from `/progress`.
4. The global feedback popup can interrupt active timed testing flows.
5. Topic drill answer options can render with mismatched prefixed labels after shuffle.
6. Header sign-out does not reliably clear the authenticated UI state.
7. Practice-test helper tools expected by the product surface are missing from the live test UI.
8. Full practice-test and group-study answer options can still render doubled embedded labels like `A A) ...`.
9. The always-on Klaviyo marketing popup can block sign-in and other critical interactions.
10. The root app shell emits a React server-to-client serialization warning involving a `Set`.
11. Production builds warn because Vega's optional `canvas` dependency is resolved through the practice-test chart render path.

## Intended Fixes

### Admin Access Control

- Add shared route-level admin gating for all `/admin/*` routes.
- Preserve existing page-local guards where they already exist, but make the shared gate authoritative.

### Progress Page Access

- Make the progress route redirect only after auth state resolves to `unauthenticated`.
- Keep the loading state stable while session status is resolving.

### Feedback Widget Safety

- Suppress automatic popup behavior on active assessment routes.
- Avoid rendering the floating feedback widget on active assessment routes where it can interfere with testing.

### Marketing Popup Safety

- Stop loading the Klaviyo onsite popup on auth and active assessment routes.
- If a user navigates from a marketing-enabled page into an auth or assessment route, immediately hide any leftover Klaviyo overlays.

### Root Shell Serialization Safety

- Keep the document shell in the server layout, but move the interactive app shell and providers behind a dedicated client wrapper.
- Avoid passing a larger mixed server/client shell tree through multiple client-provider boundaries from `src/app/layout.tsx`.
- Split auth-route page logic into dedicated client components where a server route wrapper gives a narrower server/client boundary for local warning isolation.

### Build Hygiene For Client-Only Charts

- Prevent the server build from trying to resolve Vega's optional `canvas` package for browser-only chart rendering.
- Keep interactive chart rendering available on client routes without introducing server compile noise.

### Answer Option Normalization

- Strip embedded `A)`, `B)`, `C)`, `D)` prefixes from option text before rendering and before shuffled state is stored.
- Apply the same normalization to full practice-test and group-study question payloads so all assessment surfaces render a single label layer.
- Keep option order shuffling and explanation alignment intact.

### Sign-out Reliability

- Replace fire-and-forget `signOut()` calls with an awaited sign-out flow and explicit redirect handling.
- Apply the same behavior to desktop and mobile navigation sign-out buttons.

### Practice Test Helper Tools

- Add a lightweight test toolbar to the full practice-test experience.
- Include question flagging, timer show/hide, answer strikeout support, and a digital calculator for math modules.

## Acceptance Criteria

- A normal student account is redirected away from `/admin` and `/admin/practice-tests`.
- `/progress` opens successfully for an authenticated student.
- No automatic feedback modal appears during active practice tests or drills.
- Drill answers render without doubled or mismatched choice labels.
- Full practice-test and group-study answers render without doubled or mismatched choice labels.
- No third-party marketing popup blocks sign-in, sign-up, or active assessment interactions.
- The repeated React warning about `Set` serialization no longer appears during local route smoke tests.
- `npm run build` completes without the `vega-canvas` / `canvas` module-resolution warning.
- Clicking `Sign Out` returns the UI to a guest state reliably.
- Full practice tests expose visible helper controls for timer visibility, flagging, strikeout, and math calculator usage.
- Existing test start, review, break, and drill explanation flows continue to work.

## Validation Plan

- Re-run the affected browser flows against the live app behavior served by the local code path where possible.
- Run a narrow repository validation command after code changes.
- Do not push or create a git commit in this pass.