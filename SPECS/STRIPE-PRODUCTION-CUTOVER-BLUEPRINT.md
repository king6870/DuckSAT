# Stripe Production Cutover Blueprint

## Change Set

### 1. Stripe Env Guard

- Add `src/lib/stripe-env.ts`.
- Centralize Stripe key-mode classification and runtime readiness checks.
- Keep the checks secret-safe and reusable across routes.

### 2. Guard Live Request Paths

- Update `src/lib/stripe.ts` to validate server-side Stripe secret configuration before client initialization.
- Update `src/app/api/stripe/checkout/route.ts` to require live-ready checkout config.
- Update `src/app/api/stripe/portal/route.ts` to require valid server Stripe config.
- Update `src/app/api/stripe/webhook/route.ts` to require a configured webhook secret.

### 3. Add Diagnostics

- Extend `src/app/api/env-check/route.ts` with safe Stripe config metadata.
- Add `src/app/api/stripe/status/route.ts` to retrieve and validate the configured monthly and yearly Stripe prices.

### 4. Add Verification Script

- Add `scripts/validate-stripe-live-config.ts`.
- Add an npm script that runs the live Stripe validation from local env values.

### 5. Remove Sandbox Signaling From Deployment

- Update `.github/workflows/main_ducksatapp.yml`.
- Replace the old `sk_test_...` build placeholder with clearly non-runtime placeholders that do not imply test-mode deployment.

### 6. Manual Production Cutover

- In Azure App Service, replace any old sandbox Stripe settings with the live values.
- Set the production `STRIPE_WEBHOOK_SECRET`.
- Restart the app service.
- Confirm `https://www.ducksat.com/api/stripe/status` reports `liveCheckoutReady: true`.

## Implementation Order

1. Add reusable Stripe env validation
2. Guard checkout / portal / webhook runtime paths
3. Add safe env and Stripe status diagnostics
4. Add local Stripe validation script
5. Clean workflow placeholders
6. Validate locally
7. Push and confirm deployed Stripe diagnostics

## Risks

- Production requests will fail fast once guards are added if Azure still holds test-mode or missing Stripe settings.
- Missing production webhook secret will remain a deployment blocker until the live `whsec_...` value is added outside the repo.
- Safe diagnostic endpoints must never return raw secret values.

## Rollback Strategy

- The env guard utility and diagnostics route are isolated additions and can be reverted independently.
- Workflow placeholder cleanup is low-risk and isolated to build-time-only variables.
- Manual Azure App Service setting changes can be rolled back without changing application code.