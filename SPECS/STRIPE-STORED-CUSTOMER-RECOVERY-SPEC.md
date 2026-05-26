# Stripe Stored Customer Recovery Spec

## Goal

Eliminate user-specific `500 Internal Server Error` failures from `POST /api/stripe/checkout` and `POST /api/stripe/portal` when an account has a stale, deleted, or test-mode-era `stripeCustomerId` stored in the database.

## Problem Statement

The current checkout and portal routes trust `users.stripeCustomerId` whenever it is non-null. That assumption is false for a subset of legacy or migrated users.

Observed production symptom:

- Browser console shows `api/stripe/checkout:1 Failed to load resource: the server responded with a status of 500 (Internal Server Error)`.
- The surrounding Klaviyo tracking-prevention warnings are unrelated noise and do not control the failure.

Confirmed production repro:

1. Sign in with disposable credentials account `qa05260224`.
2. Set only that user's `stripeCustomerId` to a bogus value (`cus_TESTMODE_REPRO_INVALID`).
3. Call the real authenticated production endpoint `POST /api/stripe/checkout` with `{ plan: 'monthly' }`.
4. Route returns `500` with `{ "error": "Failed to create checkout session" }`.
5. Direct Stripe API repro with the same checkout session shape fails with `No such customer: 'cus_TESTMODE_REPRO_INVALID'`.

This confirms the route is failing on stale persisted customer state, not on the plan IDs, publishable key, Klaviyo script, browser storage prevention, or general Stripe environment readiness.

## Root Cause

### Current behavior

`src/app/api/stripe/checkout/route.ts`

- Loads the signed-in user.
- Reads `stripeCustomerId`.
- If `stripeCustomerId` exists, it is passed straight into `stripe.checkout.sessions.create(...)`.
- No verification is performed that the customer still exists in the current live Stripe account.

`src/app/api/stripe/portal/route.ts`

- Uses the same assumption for `stripe.billingPortal.sessions.create(...)`.
- A stale customer ID would produce the same class of failure there.

### Why only some accounts fail

New accounts work because they either:

- have no stored customer ID yet, so a new Stripe customer is created, or
- already hold a valid live customer ID.

Affected accounts fail because they have a non-null but invalid `stripeCustomerId`, likely from one of these sources:

- customer IDs created during prior Stripe test-mode work,
- customer IDs copied from an old Stripe account context,
- deleted customers,
- partially migrated or manually edited subscription state.

## Desired Behavior

For any authenticated user:

1. If `stripeCustomerId` is missing, create a live Stripe customer and persist it.
2. If `stripeCustomerId` exists and is valid, reuse it.
3. If `stripeCustomerId` exists but Stripe reports `resource_missing` / `No such customer`, create a replacement live customer, persist the replacement ID, and continue the request successfully.
4. If Stripe fails for another reason, return a controlled error and log enough context for diagnosis.

This recovery must be shared by both checkout and billing-portal flows so behavior is consistent.

## Non-Goals

- Rebuilding old test-mode subscriptions in live Stripe.
- Migrating historical Stripe data from test mode to live mode.
- Changing Klaviyo or browser tracking-prevention behavior.
- Rewriting pricing UI or Stripe checkout UX.

## Implementation Plan

### 1. Introduce a shared Stripe customer recovery helper

Add a server-only helper in `src/lib/stripe-customer.ts` that:

- accepts the signed-in user ID plus current persisted user fields needed to create a customer (`email`, `name`, `stripeCustomerId`),
- attempts to validate an existing customer ID with `stripe.customers.retrieve(...)`,
- treats deleted/missing customers as invalid,
- creates a fresh customer when validation fails or ID is missing,
- updates `users.stripeCustomerId` in Prisma when a new customer is created,
- returns a valid customer ID for downstream checkout/portal creation.

### 2. Reuse the helper from checkout

Replace inline customer creation logic in `src/app/api/stripe/checkout/route.ts` with the shared helper.

Expected result:

- stale `stripeCustomerId` no longer causes a `500`,
- the user is transparently repaired onto a live customer,
- checkout session creation proceeds normally.

### 3. Reuse the helper from portal

Apply the same helper to `src/app/api/stripe/portal/route.ts` so stale customer IDs do not break billing management either.

### 4. Improve logging without leaking secrets

When recovery occurs, log structured server context such as:

- route name,
- user ID,
- whether the stored customer was missing or stale,
- whether a replacement customer was created.

Do not log full secrets or payment details.

### 5. Preserve behavior for healthy accounts

Healthy accounts should continue to:

- reuse their valid existing live customer ID,
- open checkout/portal without unnecessary customer duplication.

## Acceptance Criteria

### Functional

- A user with `stripeCustomerId = null` can start checkout.
- A user with a valid live `stripeCustomerId` can start checkout.
- A user with a stale/nonexistent `stripeCustomerId` can start checkout and is silently repaired.
- A user with a stale/nonexistent `stripeCustomerId` can open the billing portal and is silently repaired.

### Data integrity

- After successful recovery, `users.stripeCustomerId` stores the newly created valid live customer ID.
- No unrelated user fields are changed.

### Regression guard

- No change should reintroduce hard failure on stale customer IDs.
- Stripe environment guards remain intact.

## Validation Plan

### Reproduction before fix

1. Use disposable credentials user `qa05260224`.
2. Set its `stripeCustomerId` to an invalid value.
3. Confirm production `POST /api/stripe/checkout` returns `500`.

### Validation after fix

1. Reuse the same disposable user with the same invalid `stripeCustomerId`.
2. Confirm checkout returns `200` with a Stripe Checkout URL.
3. Confirm the user record now contains a repaired valid live `stripeCustomerId`.
4. Confirm billing portal creation also succeeds for the same repaired user.
5. Confirm a fresh user with `stripeCustomerId = null` still succeeds.

## Risks

- Duplicate Stripe customers may be created during recovery for users whose old customer ID is gone. This is acceptable because the existing ID is already unusable.
- Concurrent requests could race to create replacement customers. Mitigation: keep logic simple and update the stored ID immediately after creation; a duplicate customer is less harmful than a broken checkout.

## Rollback

If needed, revert the helper wiring in checkout and portal. No schema change is required.

## Operational Follow-Up

- Optionally identify existing users with stale `stripeCustomerId` values and repair them opportunistically or via a one-off admin script.
- Keep the new recovery path in place permanently because stale third-party IDs are a normal operational reality.