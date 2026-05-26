# Stripe Production Cutover Spec

## Goal

Remove stale sandbox-era Stripe configuration paths, make production fail fast when wired to test-mode keys, and add safe diagnostics that prove the deployed app is actually using live Stripe credentials and live price IDs.

## Problem Statement

The existing Stripe integration accepts whatever runtime environment values are present, but it does not explicitly reject test-mode keys in production and it does not expose a safe runtime status surface for the deployed app. That leaves three failure modes:

1. Production can silently keep using `sk_test_` / `pk_test_` keys.
2. Price IDs can be missing or point at the wrong Stripe account without a clear on-app diagnostic.
3. The production webhook secret can remain unset, which breaks subscription lifecycle updates even if checkout starts.

## Existing Runtime Surfaces

- `src/lib/stripe.ts`: lazy server-side Stripe client initialization
- `src/lib/stripe-config.ts`: monthly/yearly plan-to-price wiring
- `src/app/api/stripe/checkout/route.ts`: hosted checkout session creation
- `src/app/api/stripe/portal/route.ts`: Stripe billing portal launch
- `src/app/api/stripe/webhook/route.ts`: subscription lifecycle sync
- `src/app/api/env-check/route.ts`: safe public env metadata endpoint
- `.github/workflows/main_ducksatapp.yml`: Azure build/deploy workflow

## Required Production Configuration

These values must exist in Azure App Service application settings for the live app:

- `STRIPE_SECRET_KEY` using a live `sk_live_...` key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` using a live `pk_live_...` key
- `STRIPE_MONTHLY_PRICE_ID`
- `STRIPE_YEARLY_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

These values must not be committed to the repository.

## Repo Changes In Scope

### 1. Runtime Stripe Validation

- Add a shared Stripe environment utility that classifies configured key mode as `live`, `test`, `missing`, or `invalid`.
- Fail fast when production checkout, portal, or webhook code is wired to test-mode or malformed keys.

### 2. Safe Diagnostics

- Extend `GET /api/env-check` with Stripe readiness metadata that does not expose secrets.
- Add `GET /api/stripe/status` that validates the currently configured monthly and yearly price IDs against Stripe and reports whether live checkout is actually ready.

### 3. Local Validation Script

- Add a script that uses the current local environment to validate:
  - live secret key format
  - live publishable key format
  - monthly price exists, is active, and recurs monthly
  - yearly price exists, is active, and recurs yearly
- Report missing webhook secret as a production-readiness warning.

### 4. Workflow Cleanup

- Remove the old sandbox-looking Stripe placeholder from the Azure deploy workflow.
- Replace it with clearly non-runtime build placeholders so the repository no longer advertises a test Stripe path during deployment.

## Acceptance Criteria

- Production checkout and portal routes reject `sk_test_...` configuration instead of silently creating test-mode sessions.
- Production webhook route rejects missing webhook secret with a clear server-side configuration error.
- `GET /api/env-check` reports Stripe config readiness metadata.
- `GET /api/stripe/status` returns live-mode validation for both configured price IDs when production is correctly configured.
- Local `validate:stripe-live` passes against the provided live key and price IDs.
- The Azure deployment workflow no longer contains a `sk_test_...` placeholder.

## Manual Cutover Steps Outside The Repo

These steps cannot be solved by a git push alone and must be applied in Azure / Stripe:

1. Update Azure App Service application settings with the live Stripe values.
2. Add or update the production webhook endpoint at `https://www.ducksat.com/api/stripe/webhook`.
3. Copy the production `whsec_...` signing secret into Azure App Service as `STRIPE_WEBHOOK_SECRET`.
4. Restart the app service after the configuration update.
5. Verify `https://www.ducksat.com/api/stripe/status` reports `liveCheckoutReady: true`.

## Validation Plan

1. `get_errors` on all touched Stripe files
2. `npx tsc --noEmit`
3. `npm run validate:stripe-live`
4. `npm run build`
5. Local smoke test of `/pricing`, `/api/env-check`, and `/api/stripe/status`
6. Post-deploy smoke test of `https://www.ducksat.com/api/env-check` and `https://www.ducksat.com/api/stripe/status`