# QA Audit Remediation Blueprint

## Change Set

### 1. Shared Admin Gate

- Add `src/app/admin/layout.tsx`.
- Use server-side session resolution with `getServerSession(authOptions)`.
- Redirect non-admin and unauthenticated requests away from the admin route tree before client pages render.

### 2. Progress Route Auth Fix

- Update `src/app/progress/page.tsx` to use `status` from `useSession()`.
- Redirect only when `status === 'unauthenticated'`.

### 3. Feedback Route Suppression

- Update `src/components/FeedbackWidget.tsx`.
- Detect active assessment routes with `usePathname()`.
- Disable popup scheduling and hide the widget on those routes.

### 4. Reliable Sign-out Flow

- Update `src/components/UserMenu.tsx`.
- Update `src/components/MobileNav.tsx`.
- Await sign-out with redirect metadata, then navigate explicitly.

### 5. Shared Answer Option Sanitization

- Add `src/lib/optionText.ts` for shared option-label cleanup.
- Update `src/app/practice/[category]/page.tsx`.
- Update `src/hooks/useTestState.ts` so full practice tests normalize options before render, review, and result aggregation.
- Update `src/app/api/group-study/sessions/[id]/route.ts` so group-study clients receive normalized option text.
- Leave answer/explanation index mapping intact.

### 6. Practice Test Toolbar

- Update `src/app/practice-test/page.tsx`.
- Update `src/components/test/QuestionNavigator.tsx` if flagged-state visibility is needed.
- Add local UI state for:
  - flagged questions
  - hidden timer state
  - strikeout mode and struck options per question
  - calculator open state for math modules

### 7. Route-Aware Marketing Script Loading

- Add `src/components/KlaviyoEmbed.tsx`.
- Remove the always-on Klaviyo `<script>` tags from `src/app/layout.tsx`.
- Load Klaviyo only on non-auth, non-assessment routes.
- Hide existing Klaviyo overlays immediately when entering auth or assessment routes.

### 8. Client App Shell Boundary

- Add `src/components/AppShell.tsx`.
- Keep `src/app/layout.tsx` focused on `<html>`, `<head>`, `<body>`, fonts, and static document concerns.
- Move providers, header/nav, feedback widget, referral popup, and Klaviyo embed behind the client shell boundary.
- Split `src/app/auth/signin/page.tsx` into a server route wrapper and `src/components/auth/SignInContent.tsx` so auth-page client logic no longer lives directly at the route root.
- Revalidate auth and practice-test routes for disappearance of the `Set` serialization warning.

### 9. Build Warning Cleanup For Vega

- Add a webpack alias for `canvas` in `next.config.js` so browser-only Vega rendering does not emit server-build warnings.
- Keep `src/components/ChartRenderer.tsx` on the client render path and isolate `react-vega` usage in a dedicated client-only wrapper component.

## Order Of Implementation

1. Admin gate
2. Progress auth fix
3. Feedback suppression
4. Sign-out reliability
5. Shared answer option sanitization
6. Practice-test toolbar
7. Route-aware marketing script loading
8. Client app shell boundary
9. Build warning cleanup for Vega
10. Validation

## Risks

- Client pages that already redirect may briefly duplicate route protection logic after the shared admin layout is added.
- Hiding the feedback widget on assessment routes changes cross-site feedback collection timing.
- Strikeout behavior must not block normal answer selection when disabled.
- The `Set` serialization warning may persist even after shell-boundary refactors if the remaining source is inside a framework/provider boundary rather than application state.

## Rollback Strategy

- Each change is isolated to a small number of files.
- The shared admin layout can be removed independently if it introduces route issues.
- The practice-test helper toolbar is additive and can be reverted without touching scoring or module flow.