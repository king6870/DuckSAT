# New Account Email Alert Spec

## Goal

Send an internal notification email to `lionvihaan@gmail.com` whenever a brand-new DuckSAT account is created, using `info@ducksat.com` as the sender address through a transactional email provider such as Resend or Sender.

## Recommended Provider

Use Resend unless there is already an active Sender account ready to go.

Why Resend is the preferred default for this codebase:

- simple HTTP API and Next.js-friendly SDK,
- straightforward domain verification for `ducksat.com`,
- easy server-side integration without SMTP setup,
- clean fit for lightweight internal notification emails.

This spec keeps the email-sending code isolated so Sender can be substituted later if needed.

## Problem Statement

DuckSAT currently creates user accounts without notifying the site owner. That means:

- no immediate visibility into new user acquisition,
- no simple operational alert when signups begin failing or suddenly spike,
- no internal record from the app layer that a new account was created.

The app has two distinct account-creation paths today:

1. Credentials signup via `POST /api/auth/signup`, which manually creates the user in Prisma.
2. First-time Google OAuth signup via NextAuth + Prisma Adapter, which creates the user automatically before the user lands on the welcome page.

If this feature is implemented only in the credentials route, Google signups will be missed. If it is implemented only in NextAuth callbacks, credentials signups will be missed.

## Scope

This feature should send one internal email for each newly created user record originating from public auth flows.

Included:

- credentials signups from `src/app/api/auth/signup/route.ts`,
- first-time Google signups created through NextAuth,
- production delivery using a verified `info@ducksat.com` sender,
- safe failure behavior so account creation still succeeds if email delivery fails.

Excluded:

- welcome emails to end users,
- marketing sequences,
- retroactive alerts for existing users,
- notifications for repeat logins,
- alerts for manual database inserts or import scripts unless explicitly added later.

## Current Code Paths

### Credentials signup

`src/app/api/auth/signup/route.ts`

- validates username, password, and optional referral code,
- creates the user with `prisma.user.create(...)`,
- stores a synthetic email in the format `username@duck.local`,
- returns `201` on success.

Important constraint:

- credentials users do not provide a real email address at signup today, so the alert email cannot assume the stored email is user-reachable.

### Google signup

`src/lib/auth.ts`

- configures NextAuth with Google and Credentials providers,
- uses `PrismaAdapter(prisma)`,
- allows first-time Google sign-in to create a new `users` row automatically.

Important constraint:

- a Google account can exist before any later onboarding or username selection happens,
- therefore the alert must be tied to actual user creation, not later welcome-page completion.

## Desired Behavior

When any brand-new public DuckSAT account is created:

1. DuckSAT attempts to send one internal email to `lionvihaan@gmail.com`.
2. The email is sent from `info@ducksat.com`.
3. The email includes enough metadata to identify the new account and signup source.
4. Delivery failure does not block account creation.
5. Existing-user sign-ins do not trigger another email.

## Functional Requirements

### Trigger conditions

Send an alert when:

- a credentials signup successfully inserts a new `users` row,
- a first-time Google OAuth signup causes NextAuth/Prisma to create a new `users` row.

Do not send an alert when:

- a user signs in again,
- a signup attempt fails validation,
- database creation fails,
- a referral is merely applied,
- a returning Google user signs in.

### Email contents

Each email should include:

- environment name (`production`, `development`, etc.),
- signup method (`credentials` or `google`),
- user ID,
- username if available,
- display name if available,
- stored email,
- whether the stored email is synthetic (`@duck.local`) or real,
- user creation timestamp,
- referral code used if available,
- source IP for credentials signups if easily available,
- app URL or environment origin.

Suggested subject format:

- `[DuckSAT] New account created: qa05260224 (credentials)`
- `[DuckSAT] New account created: jane@gmail.com (google)`

### Delivery behavior

- The app should await the delivery attempt after the user has already been created.
- The send should be wrapped in `try/catch` and must never roll back or block the successful signup response.
- A short timeout guard is recommended so the email provider cannot hold the signup request open indefinitely.

Rationale:

- true fire-and-forget work is less reliable in web request lifecycles,
- but the email attempt must remain non-fatal.

## Architecture

### 1. Add a small provider wrapper

Create a server-only mail client layer, for example:

- `src/lib/email/client.ts`
- `src/lib/email/config.ts`

Responsibilities:

- load and validate required env vars,
- initialize the provider SDK or HTTP client,
- expose a minimal `sendEmail(...)` interface,
- keep provider-specific details out of auth flows.

Initial implementation target:

- Resend SDK via a single reusable client.

Future-compatible option:

- keep the wrapper narrow so Sender can be swapped in later without rewriting signup flows.

### 2. Add a dedicated signup alert helper

Create a helper such as:

- `src/lib/email/send-new-account-alert.ts`

Responsibilities:

- accept normalized account creation metadata,
- format the subject and body,
- optionally set `replyTo` only when the new user has a real non-`@duck.local` email,
- call the provider wrapper,
- log safe success/failure context.

Recommended input shape:

- `userId`
- `signupMethod`
- `username`
- `name`
- `email`
- `createdAt`
- `referralCodeUsed`
- `ipAddress`
- `environment`

### 3. Wire credentials signup to the helper

Update `src/app/api/auth/signup/route.ts` so that after `prisma.user.create(...)` succeeds, it calls the new alert helper.

Implementation notes:

- expand the selected fields returned from `prisma.user.create(...)` so the helper has the data it needs,
- preserve the existing response contract,
- keep referral awarding separate from alert delivery,
- do not log passwords or password hashes.

### 4. Wire Google signup through NextAuth events

Update `src/lib/auth.ts` to add a NextAuth `events.createUser` handler.

Why this is the right hook:

- it only fires when NextAuth creates a brand-new user,
- it does not run on ordinary returning-user sign-ins,
- it covers the Prisma Adapter path that credentials signup bypasses.

Implementation notes:

- identify the signup method as `google`,
- call the same shared alert helper used by credentials signup,
- expect that `username` may be null for Google-created users,
- use the actual Google email when present.

## Logging And Failure Policy

Logging should be structured and safe.

Log on success:

- route or hook name,
- user ID,
- signup method,
- whether delivery was attempted,
- provider name.

Log on failure:

- route or hook name,
- user ID,
- signup method,
- provider name,
- sanitized error message.

Do not log:

- API keys,
- auth tokens,
- password hashes,
- full raw request bodies.

Failure policy:

- if email sending fails, continue signup normally,
- return the existing success response,
- keep the failure visible in server logs for diagnosis.

## Environment Variables

If using Resend, add:

- `RESEND_API_KEY`
- `SIGNUP_ALERT_FROM_EMAIL=info@ducksat.com`
- `SIGNUP_ALERT_TO_EMAIL=lionvihaan@gmail.com`
- `SIGNUP_ALERTS_ENABLED=true`

Optional:

- `SIGNUP_ALERT_PROVIDER=resend`
- `APP_BASE_URL=https://www.ducksat.com` if the implementation wants a canonical URL in the email body.

If using Sender instead, the equivalent variables would be:

- `SENDER_API_KEY` or SMTP credentials, depending on Sender integration mode,
- `SIGNUP_ALERT_FROM_EMAIL=info@ducksat.com`
- `SIGNUP_ALERT_TO_EMAIL=lionvihaan@gmail.com`
- `SIGNUP_ALERTS_ENABLED=true`

## Deployment Requirements

Before enabling production delivery:

1. Verify the sending domain for `info@ducksat.com` with the chosen provider.
2. Add required DNS records for SPF, DKIM, and any provider-specific verification.
3. Add the email env vars to local development if needed.
4. Add the same env vars to Azure App Settings for production.
5. If deployment automation should manage these values, extend the deploy workflow secret sync to include the new email secrets.

## Acceptance Criteria

### Credentials flow

- A successful credentials signup sends exactly one internal alert email.
- The signup still returns `201` even if the provider is down.

### Google flow

- A first-time Google signup sends exactly one internal alert email.
- A returning Google sign-in sends no alert.

### Message quality

- The email is sent from `info@ducksat.com`.
- The recipient is `lionvihaan@gmail.com`.
- The email clearly identifies the new account and auth method.

### Safety

- No secrets or password data are exposed in logs or emails.
- Missing email-provider configuration does not break signup routes.

## Validation Plan

### Local validation

1. Configure the provider in `.env.local`.
2. Create a disposable credentials account.
3. Confirm the signup returns success.
4. Confirm the internal email arrives.
5. Sign in again with the same account and confirm no new alert is sent.

### Google validation

1. Use a Google account that does not yet exist in DuckSAT.
2. Complete first-time Google sign-in.
3. Confirm one alert email arrives.
4. Sign out and sign in again.
5. Confirm no duplicate alert is sent.

### Failure-mode validation

1. Temporarily use an invalid email API key.
2. Create a disposable credentials account.
3. Confirm signup still succeeds.
4. Confirm the server logs show a sanitized delivery failure.

## Risks

- Google-created accounts may not yet have a DuckSAT username at the time the alert is sent.
- Provider outages may delay signup slightly if timeout handling is not added.
- Using a synthetic `@duck.local` email for credentials users means the alert should treat that field as an internal identifier, not a contact address.

## Non-Goals

- Sending onboarding or welcome emails to the end user.
- Capturing marketing attribution beyond the signup metadata already available in-app.
- Building a general-purpose notifications platform.

## Implementation Summary

Use one shared email alert helper and wire it into both user-creation surfaces:

- `src/app/api/auth/signup/route.ts` for credentials signups,
- `events.createUser` in `src/lib/auth.ts` for Google-created users.

Prefer Resend for the first implementation. Keep the send non-fatal, server-only, and isolated behind a tiny provider wrapper.

## Inputs Needed To Implement

To build this end-to-end, the missing inputs are:

1. Provider choice: Resend or Sender.
2. The production API key for that provider.
3. Confirmation that `info@ducksat.com` is already provisioned and can be verified as a sender.
4. DNS access or confirmation that SPF/DKIM records can be added for the chosen provider.
5. Confirmation that the alert recipient should remain only `lionvihaan@gmail.com`.
6. Confirmation whether you want the alert to fire at user creation time for Google accounts, even if the user has not completed later onboarding yet.

If you want the fastest implementation path, the simplest answer is:

- use Resend,
- give me `RESEND_API_KEY`,
- verify `info@ducksat.com` in Resend,
- confirm `lionvihaan@gmail.com` as the recipient.