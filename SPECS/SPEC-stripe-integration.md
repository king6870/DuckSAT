# SPEC: Stripe Subscription Integration

**Epic**: Monetization & Pricing Tiers  
**Status**: Draft  
**Date**: 2025-07-15  
**Depends on**: NextAuth (existing), Prisma/Azure SQL (existing)

---

## 1. Overview

Integrate Stripe subscriptions into DuckSAT with 3 pricing tiers that gate access to practice tests and topic drills. Includes a public pricing page, Stripe Checkout for sign-up, Stripe Customer Portal for billing management, and webhook-driven subscription lifecycle management.

---

## 2. Pricing Plans

| Feature | Free | Monthly ($25/mo) | Yearly ($250/year) |
|---|---|---|---|
| Practice Tests / month | **1** | **10** | **15** |
| Topic Drills / month | **3** | **Unlimited** | **Unlimited** |
| Free Trial | — | **1 month** (CC required) | — |
| Price | $0 | $25/month | $250/year (~$20.83/mo) |

### Plan Rules
- **Free**: Default for all new users. No Stripe interaction needed.
- **Monthly**: 1-month free trial with credit card upfront. After trial, $25/month auto-renews. User can cancel anytime (access continues until period end).
- **Yearly**: $250 billed annually. No trial. 5 extra practice tests/month compared to monthly.

### Usage Tracking
- Practice test count resets on the 1st of each calendar month (UTC).
- Drill session count resets on the 1st of each calendar month (UTC).
- A "practice test use" is counted when the user **starts** a test (not on completion).
- A "drill use" is counted when the user **starts** a drill session (loads the first question).

---

## 3. Environment Variables

### What the user needs to set

Add these to `.env.local` (local dev) and Azure App Service > Configuration > Application settings (production):

| Variable | Where to find it | Example |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → **Secret key** | `sk_live_...` or `sk_test_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys → **Publishable key** | `pk_live_...` or `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → select endpoint → **Signing secret** | `whsec_...` |

> **Important**: Use `sk_test_` / `pk_test_` keys for development. Switch to `sk_live_` / `pk_live_` for production. The webhook secret is different per endpoint (local vs production).

### Stripe Dashboard Setup (Manual Steps)

The user must create these in the Stripe Dashboard **before** implementation can work:

1. **Product: "DuckSAT Monthly"**
   - Price: $25.00 USD, recurring monthly
   - Note the Price ID (e.g., `price_xxxMonthly`)

2. **Product: "DuckSAT Yearly"**
   - Price: $250.00 USD, recurring yearly
   - Note the Price ID (e.g., `price_xxxYearly`)

3. **Webhook Endpoint** (production):
   - URL: `https://www.ducksat.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

4. **Webhook Endpoint** (local dev with Stripe CLI):
   - Run: `stripe listen --forward-to localhost:3001/api/stripe/webhook`
   - Use the `whsec_` value printed by the CLI as `STRIPE_WEBHOOK_SECRET` in `.env.local`

5. **Customer Portal Configuration** (Stripe Dashboard → Settings → Billing → Customer portal):
   - Enable subscription cancellation
   - Enable plan switching (monthly ↔ yearly)
   - Enable invoice history

### Hardcoded Config

Store Stripe Price IDs in a config file (`src/lib/stripe-config.ts`) rather than env vars, since they don't change per environment if using the same Stripe account:

```ts
export const STRIPE_PLANS = {
  free: {
    name: 'Free',
    practiceTestsPerMonth: 1,
    drillsPerMonth: 3,
    priceId: null, // No Stripe price
  },
  monthly: {
    name: 'Monthly',
    practiceTestsPerMonth: 10,
    drillsPerMonth: Infinity,
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID!, // Set in env
    trialDays: 30,
  },
  yearly: {
    name: 'Yearly',
    practiceTestsPerMonth: 15,
    drillsPerMonth: Infinity,
    priceId: process.env.STRIPE_YEARLY_PRICE_ID!, // Set in env
    trialDays: 0,
  },
} as const;
```

> This means 2 additional env vars: `STRIPE_MONTHLY_PRICE_ID` and `STRIPE_YEARLY_PRICE_ID`.

### Complete Env Var List (New)

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Yes | Stripe API secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key (exposed to browser) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook endpoint signing secret |
| `STRIPE_MONTHLY_PRICE_ID` | Yes | Price ID for monthly plan (from Stripe Dashboard) |
| `STRIPE_YEARLY_PRICE_ID` | Yes | Price ID for yearly plan (from Stripe Dashboard) |

---

## 4. Database Schema Changes

### New fields on `User` model

```prisma
model User {
  // ... existing fields ...

  // Stripe subscription fields
  stripeCustomerId    String?   @unique  // Stripe Customer ID (cus_xxx)
  subscriptionPlan    String    @default("free")  // 'free' | 'monthly' | 'yearly'
  subscriptionStatus  String    @default("none")  // 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
  stripeSubscriptionId String?  @unique  // Stripe Subscription ID (sub_xxx)
  currentPeriodEnd    DateTime? // When the current billing period ends
  trialEnd            DateTime? // When the trial period ends (null if no trial)
  cancelAtPeriodEnd   Boolean   @default(false) // Whether subscription will cancel at period end
}
```

### New `UsageRecord` model

```prisma
model UsageRecord {
  id        String   @id @default(cuid())
  userId    String
  type      String   // 'practice_test' | 'drill'
  year      Int      // e.g., 2025
  month     Int      // 1-12
  count     Int      @default(0)
  updatedAt DateTime @updatedAt

  @@unique([userId, type, year, month])
  @@index([userId])
  @@map("usage_records")
}
```

This model tracks monthly usage per user. Instead of resetting counts, we query by current year/month. Old records serve as historical data.

### Migration Plan

1. Add new fields to `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add-stripe-subscription-fields`
3. All existing users will default to `subscriptionPlan: "free"`, `subscriptionStatus: "none"`
4. No data loss — all new fields are optional or have defaults

---

## 5. New Packages

```bash
npm install stripe
```

Only one new dependency. Stripe's Node.js SDK handles:
- Creating Checkout Sessions
- Managing Customer Portal
- Verifying webhook signatures
- All Stripe API interactions

No `@stripe/stripe-js` or `@stripe/react-stripe-js` needed — we use Stripe Checkout (hosted by Stripe), not embedded elements.

---

## 6. New Files & API Routes

### Library Files

#### `src/lib/stripe.ts`
Server-side Stripe client initialization:
```ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil', // Use latest stable
});
```

#### `src/lib/stripe-config.ts`
Plan definitions and limits (see Section 3).

#### `src/lib/subscription.ts`
Helper functions:
- `getUserSubscription(userId)` → returns plan, status, limits
- `checkUsageLimit(userId, type: 'practice_test' | 'drill')` → returns `{ allowed: boolean, used: number, limit: number }`
- `incrementUsage(userId, type)` → increments monthly count
- `getEffectivePlan(user)` → resolves actual plan considering trial, cancellation, past_due

### API Routes

#### `POST /api/stripe/checkout` — Create Checkout Session
- **Auth**: Required (authenticated users only)
- **Body**: `{ plan: 'monthly' | 'yearly' }`
- **Logic**:
  1. Get authenticated user from session
  2. Create or retrieve Stripe Customer (link to user via `stripeCustomerId`)
  3. Create Stripe Checkout Session with:
     - `mode: 'subscription'`
     - `line_items`: the selected price
     - `subscription_data.trial_period_days`: 30 for monthly, 0 for yearly
     - `success_url`: `https://www.ducksat.com/pricing?success=true`
     - `cancel_url`: `https://www.ducksat.com/pricing?canceled=true`
     - `customer_email`: user's email (if no existing Stripe customer)
     - `metadata.userId`: for webhook correlation
  4. Return `{ url: session.url }` for client redirect

#### `POST /api/stripe/portal` — Create Customer Portal Session
- **Auth**: Required
- **Logic**:
  1. Get user's `stripeCustomerId`
  2. Create Stripe Billing Portal session
  3. Return `{ url: session.url }` for redirect
- **Use case**: User wants to manage billing, cancel, switch plans, view invoices

#### `POST /api/stripe/webhook` — Stripe Webhook Handler
- **Auth**: None (verified via Stripe signature)
- **Important**: Must read raw body (not JSON-parsed) for signature verification
- **Events handled**:

| Event | Action |
|---|---|
| `checkout.session.completed` | Link Stripe customer to user, set initial plan/status |
| `customer.subscription.created` | Set `subscriptionPlan`, `subscriptionStatus`, `currentPeriodEnd`, `trialEnd` |
| `customer.subscription.updated` | Update plan (if switched), status, period dates, `cancelAtPeriodEnd` |
| `customer.subscription.deleted` | Set `subscriptionPlan: 'free'`, `subscriptionStatus: 'none'`, clear Stripe fields |
| `invoice.payment_succeeded` | Confirm `subscriptionStatus: 'active'`, update `currentPeriodEnd` |
| `invoice.payment_failed` | Set `subscriptionStatus: 'past_due'` |

#### `GET /api/subscription` — Get Current User's Subscription
- **Auth**: Required
- **Returns**: `{ plan, status, currentPeriodEnd, trialEnd, cancelAtPeriodEnd, usage: { practiceTests: { used, limit }, drills: { used, limit } } }`
- **Used by**: Pricing page (show current plan), practice-tests page (show remaining), practice drills page (show remaining)

#### `POST /api/subscription/check-usage` — Check & Increment Usage
- **Auth**: Required
- **Body**: `{ type: 'practice_test' | 'drill' }`
- **Returns**: `{ allowed: boolean, used: number, limit: number }`
- **Logic**: Check if user is within their plan limit for the current month. Does NOT increment — that happens when the user actually starts.

### Route Config for Webhook

The webhook route needs raw body access. In Next.js App Router:

```ts
// src/app/api/stripe/webhook/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Disable body parsing — Stripe needs the raw body
export async function POST(request: Request) {
  const body = await request.text(); // Raw body
  const sig = request.headers.get('stripe-signature')!;
  // Verify with stripe.webhooks.constructEvent(body, sig, webhookSecret)
}
```

---

## 7. Pricing Page

### Route: `/pricing`

New page at `src/app/pricing/page.tsx`.

**Design**:
- Clean 3-column layout (responsive → stacked on mobile)
- Each plan as a card with:
  - Plan name + price
  - Feature list with checkmarks
  - CTA button
- Monthly plan highlighted as "Most Popular" with accent border
- Yearly plan shows savings badge ("Save $50/year")

**Card Details**:

| | Free | Monthly | Yearly |
|---|---|---|---|
| Price | **$0** | **$25**/month | **$250**/year |
| Badge | — | Most Popular | Best Value |
| Feature 1 | 1 practice test/month | 10 practice tests/month | 15 practice tests/month |
| Feature 2 | 3 topic drills/month | Unlimited topic drills | Unlimited topic drills |
| Feature 3 | Basic progress tracking | Full progress tracking | Full progress tracking |
| Feature 4 | — | 1 month free trial | Priority support |
| CTA (no subscription) | "Get Started" → sign in | "Start Free Trial" → Checkout | "Subscribe" → Checkout |
| CTA (current plan) | "Current Plan" (disabled) | "Current Plan" (disabled) | "Current Plan" (disabled) |
| CTA (different plan) | "Downgrade" → Portal | "Switch Plan" → Portal | "Upgrade" → Checkout or Portal |

**Behavior**:
- If user is NOT signed in: All CTAs redirect to sign-in flow, then back to pricing
- If user IS signed in with Free plan: Monthly/Yearly CTAs go to Stripe Checkout
- If user has active subscription: "Manage Subscription" button → Stripe Customer Portal
- Show success/cancel banners based on `?success=true` / `?canceled=true` query params

### Navigation

Add "Pricing" link to the global nav in `src/app/layout.tsx`:
```tsx
<Link href="/pricing" className="...">Pricing</Link>
```

Place it after "Our Goal" and before "Progress" in the nav bar.

---

## 8. Paywall Integration Points

### 8.1 Practice Tests Page (`src/app/practice-tests/page.tsx`)

**Current**: Shows all 10 tests openly. No restrictions.

**After**:
1. Fetch user's subscription + usage from `/api/subscription`
2. Show a banner at the top: "You've used **X of Y** practice tests this month"
3. If `used >= limit`:
   - Disable "Start Test" buttons
   - Show upgrade prompt: "You've reached your monthly limit. Upgrade for more tests →"
   - Link to `/pricing`
4. The API endpoint that starts a test (`POST` to begin test flow) should also server-side validate usage before allowing test start

### 8.2 Practice Drills Page (`src/app/practice/page.tsx`)

**Current**: Shows all 8 drill categories openly. No restrictions.

**After**:
1. Fetch user's subscription + usage from `/api/subscription`
2. Free users: Show banner "You've used **X of 3** topic drills this month"
3. If `used >= limit` (Free plan only):
   - Disable drill start buttons for remaining categories
   - Show upgrade prompt
4. Monthly/Yearly users: No banner needed (unlimited)

### 8.3 API-Level Enforcement

**Critical**: Client-side checks are cosmetic. The real enforcement happens server-side.

Modify these API routes to check subscription before proceeding:

| API Route | Check |
|---|---|
| `POST /api/test-results` (or wherever test starts) | Check `practice_test` usage before allowing test start |
| `GET /api/questions/practice` (drill questions) | Check `drill` usage before returning questions |

Add a reusable middleware/helper:
```ts
async function enforceUsageLimit(userId: string, type: 'practice_test' | 'drill') {
  const { allowed, used, limit } = await checkUsageLimit(userId, type);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Usage limit reached', used, limit, upgradeUrl: '/pricing' },
      { status: 403 }
    );
  }
  // Increment usage
  await incrementUsage(userId, type);
  return null; // Proceed
}
```

### 8.4 Test Start Tracking

Currently, the test start flow is:
1. User clicks "Start Test" on `/practice-tests`
2. Routes to `/practice-test?practiceTestId={id}`
3. TestLauncher component loads → user clicks "Begin"
4. Questions are fetched

Usage should be counted at step 3 (when the user commits to starting). Add a `POST /api/practice-tests/start` endpoint:
- Check usage limit
- Increment usage
- Return `{ allowed: true }` or `{ allowed: false, ... }`

The TestLauncher component calls this before loading questions.

### 8.5 Drill Start Tracking

Similarly, when a user clicks into a drill category and the first question loads, call `POST /api/drills/start`:
- Check usage limit
- Increment usage
- Return allowed/denied

---

## 9. Subscription State Machine

```
[No Subscription] --checkout--> [Trialing] --trial ends--> [Active] --payment fails--> [Past Due]
                                                            |                           |
                                                            |--cancel--> [Canceled]     |--retry succeeds--> [Active]
                                                            |                           |--retry fails--> [Unpaid]
[Canceled] --period ends--> [No Subscription / Free]
[Past Due] --grace period expires--> [Unpaid] --eventually--> [No Subscription / Free]
```

**Access rules by status**:
| Status | Access Level |
|---|---|
| `none` | Free tier |
| `trialing` | Full paid tier (monthly or yearly limits) |
| `active` | Full paid tier |
| `past_due` | Full paid tier (grace period — Stripe retries payment) |
| `canceled` | Full paid tier until `currentPeriodEnd`, then drops to Free |
| `unpaid` | Free tier |

---

## 10. Implementation Order

### Phase 1: Foundation
1. Install `stripe` package
2. Add Stripe env vars to `.env.local`
3. Create `src/lib/stripe.ts` (client init)
4. Create `src/lib/stripe-config.ts` (plan definitions)
5. Update Prisma schema (User fields + UsageRecord model)
6. Run migration

### Phase 2: Stripe API Routes
7. `POST /api/stripe/checkout` — create checkout session
8. `POST /api/stripe/webhook` — handle Stripe events
9. `POST /api/stripe/portal` — customer portal redirect
10. `GET /api/subscription` — get user's current plan + usage

### Phase 3: Pricing Page
11. Create `/pricing` page with 3-tier cards
12. Add "Pricing" to global nav
13. Wire up CTA buttons to checkout/portal APIs

### Phase 4: Paywall & Usage Enforcement
14. Create `src/lib/subscription.ts` helper functions
15. Add `UsageRecord` tracking to test start flow
16. Add `UsageRecord` tracking to drill start flow
17. Update practice-tests page with usage banner + gating
18. Update practice drills page with usage banner + gating
19. Add server-side enforcement to practice test API
20. Add server-side enforcement to drill questions API

### Phase 5: Polish & Deploy
21. Test full flow with Stripe test keys
22. Test webhook handling locally with Stripe CLI
23. Add Stripe env vars to Azure App Service
24. Create webhook endpoint in Stripe Dashboard for production URL
25. Deploy and verify

---

## 11. Security Considerations

- **Webhook verification**: Always verify Stripe webhook signatures. Never trust unverified webhook payloads.
- **Server-side enforcement**: Never rely solely on client-side checks for usage limits. All limits enforced at API level.
- **No Stripe keys in client**: Only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is exposed to the browser. The secret key stays server-side.
- **Raw body for webhooks**: The webhook route must NOT parse JSON before signature verification. Use `request.text()`.
- **CSRF**: Stripe Checkout uses redirect-based flow (not embedded), so no CSRF concerns. Portal sessions are similarly redirect-based.
- **Idempotent webhooks**: Handle duplicate webhook events gracefully (Stripe may retry). Use subscription ID as a natural idempotency key.

---

## 12. Content Scaling Note

With paid plans allowing 10-15 practice tests/month, the current 10 published tests won't be enough for repeat users. Future work:
- Generate additional practice tests beyond the current 10
- Rotate question pools so each test attempt can feel fresh
- Consider dynamic test generation from the 4,494 unreserved question pool

This is **not** in scope for this SPEC but worth tracking as a follow-up.

---

## 13. File Change Summary

| File | Action | Description |
|---|---|---|
| `package.json` | Modify | Add `stripe` dependency |
| `prisma/schema.prisma` | Modify | Add subscription fields to User, add UsageRecord model |
| `src/lib/stripe.ts` | **New** | Stripe SDK client initialization |
| `src/lib/stripe-config.ts` | **New** | Plan definitions, limits, price IDs |
| `src/lib/subscription.ts` | **New** | Subscription helpers (check plan, check usage, increment) |
| `src/app/api/stripe/checkout/route.ts` | **New** | Create Stripe Checkout session |
| `src/app/api/stripe/webhook/route.ts` | **New** | Handle Stripe webhook events |
| `src/app/api/stripe/portal/route.ts` | **New** | Create Stripe Customer Portal session |
| `src/app/api/subscription/route.ts` | **New** | Get user's subscription + usage data |
| `src/app/pricing/page.tsx` | **New** | Pricing page with 3-tier comparison |
| `src/app/layout.tsx` | Modify | Add "Pricing" nav link |
| `src/app/practice-tests/page.tsx` | Modify | Add usage banner, gate test starts |
| `src/app/practice/page.tsx` | Modify | Add usage banner, gate drill starts |
| `src/app/api/practice-tests/route.ts` | Modify | Add server-side usage check |
| `src/app/api/questions/practice/route.ts` | Modify | Add server-side usage check |
| `.env.local` | Modify | Add 5 new Stripe env vars |

**Total**: 7 new files, 7 modified files
