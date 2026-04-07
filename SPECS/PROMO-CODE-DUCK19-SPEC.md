# Spec: Promo Code DUCK19 — Tester Lifetime Access

**Status**: Ready for Implementation  
**Author**: GitHub Copilot  
**Date**: 2026-04-06  

---

## 1. Overview

Add a promo code field to the pricing page so beta testers can enter `DUCK19` and receive free, infinite yearly-equivalent access. The user is flagged as a tester in the database for analytics and support purposes.

**Scope: In**
- New `isTester` and `promoCodeUsed` fields on the `User` model (Prisma migration)
- New API route `POST /api/promo/redeem`
- Promo code input UI on `/pricing` page
- Zero Stripe involvement — access is granted directly in DB (no invoice, no subscription created)

**Scope: Out**
- Stripe Promotion Codes or Coupons (not needed; bypass billing entirely for testers)
- Admin dashboard for listing testers (nice-to-have, not in this spec)
- Expiry enforcement (tester access never expires; `currentPeriodEnd = 2099-12-31`)
- Multiple promo codes

**Success Criteria**
- A user with no account enters DUCK19 on the pricing page, signs in, enters DUCK19, and immediately has full yearly access
- A user who already has monthly/yearly paid subscription and enters DUCK19 is upgraded to tester status without disrupting Stripe
- Entering an invalid code shows a clear error
- Entering DUCK19 a second time is idempotent (no error, just confirms status)
- `isTester = true` and `promoCodeUsed = 'DUCK19'` appear in the `users` table

---

## 2. Database Changes

### 2.1 Prisma Schema — `User` model

Add two fields to `prisma/schema.prisma` inside the `User` model, after the Stripe subscription fields:

```prisma
// Tester / promo fields
isTester       Boolean   @default(false)
promoCodeUsed  String?   // e.g. 'DUCK19'
```

### 2.2 Migration

Run `npx prisma migrate dev --name add_tester_fields` locally, then include the migration SQL in the production deploy step.

The migration SQL will be:

```sql
ALTER TABLE users ADD isTester BIT NOT NULL DEFAULT 0;
ALTER TABLE users ADD promoCodeUsed NVARCHAR(1000) NULL;
```

*(SQL Server syntax — generated automatically by Prisma)*

---

## 3. API Design

### `POST /api/promo/redeem`

**Auth**: Required (NextAuth session). Returns 401 if unauthenticated.

**Request Body**:
```json
{ "code": "DUCK19" }
```

**Business Logic**:

1. Normalize the code: `code.trim().toUpperCase()`
2. If code is not `"DUCK19"` → return `400 { error: "Invalid promo code" }`
3. Load user from DB
4. If `user.isTester === true` → return `200 { alreadyRedeemed: true, message: "You already have tester access!" }`
5. Update user:
   ```
   subscriptionPlan: 'yearly'
   subscriptionStatus: 'active'
   currentPeriodEnd: new Date('2099-12-31T23:59:59Z')
   isTester: true
   promoCodeUsed: 'DUCK19'
   cancelAtPeriodEnd: false
   ```
   - Do NOT touch `stripeCustomerId` or `stripeSubscriptionId` — if the user already has a paid Stripe subscription those remain intact and will be used for billing history
6. Return `200 { success: true, message: "Tester access activated! Enjoy unlimited access." }`

**Important**: Do not call Stripe. No subscription is created in Stripe for DUCK19 users.

**Error Responses**:

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{ error: "Unauthorized" }` | No session |
| 400 | `{ error: "Invalid promo code" }` | Code ≠ DUCK19 |
| 200 | `{ alreadyRedeemed: true, message: "..." }` | User already a tester |
| 200 | `{ success: true, message: "..." }` | Successfully activated |
| 500 | `{ error: "Failed to redeem promo code" }` | DB error |

**File**: `src/app/api/promo/redeem/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const VALID_CODES: Record<string, { plan: string; label: string }> = {
  DUCK19: { plan: 'yearly', label: 'Tester Lifetime Access' },
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const code = (body.code ?? '').trim().toUpperCase();

  if (!VALID_CODES[code]) {
    return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.isTester) {
    return NextResponse.json({ alreadyRedeemed: true, message: 'You already have tester access!' });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      subscriptionPlan: 'yearly',
      subscriptionStatus: 'active',
      currentPeriodEnd: new Date('2099-12-31T23:59:59Z'),
      isTester: true,
      promoCodeUsed: code,
      cancelAtPeriodEnd: false,
    },
  });

  return NextResponse.json({ success: true, message: 'Tester access activated! Enjoy unlimited access.' });
}
```

---

## 4. Pricing Page UI Changes

### 4.1 Location

Add the promo code section **below the three pricing cards**, before the "All plans include" features strip (or the bottom of the page). It must be visible whether the user is logged in or not.

### 4.2 Component Behavior

- Shows a collapsed "Have a promo code?" link by default
- Clicking expands an inline input + "Apply" button
- If the user is not logged in and applies: redirect to `/auth/signin?callbackUrl=/pricing`
- On success: show a green confirmation banner; hide the input; show "✓ Tester access activated!"
- On invalid code: show a red inline error "That code isn't valid."
- On already-redeemed: show a green "You already have tester access!"
- Input is case-insensitive (normalize on both front and back end)

### 4.3 UI Mockup

```
┌──────────────────────────────────────────────────────────┐
│  Have a promo code?  ▼                                   │
│  ┌──────────────────────────┐  ┌──────────┐             │
│  │  Enter code (e.g. DUCK19) │  │  Apply   │             │
│  └──────────────────────────┘  └──────────┘             │
│  ✓ Tester access activated! (green, on success)          │
│  ✗ That code isn't valid. (red, on bad code)             │
└──────────────────────────────────────────────────────────┘
```

### 4.4 State Management

Add to `PricingContent` component:

```typescript
const [promoOpen, setPromoOpen] = useState(false)
const [promoCode, setPromoCode] = useState('')
const [promoLoading, setPromoLoading] = useState(false)
const [promoResult, setPromoResult] = useState<{ ok: boolean; message: string } | null>(null)

async function handlePromoRedeem() {
  if (!session) {
    window.location.href = `/auth/signin?callbackUrl=/pricing`
    return
  }
  setPromoLoading(true)
  setPromoResult(null)
  try {
    const res = await fetch('/api/promo/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoCode }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPromoResult({ ok: false, message: data.error ?? 'Something went wrong.' })
    } else {
      setPromoResult({ ok: true, message: data.message })
      // Refresh subscription state
      const sub = await fetch('/api/subscription').then(r => r.json())
      if (!sub.error) setSubscription(sub)
    }
  } catch {
    setPromoResult({ ok: false, message: 'Network error. Please try again.' })
  } finally {
    setPromoLoading(false)
  }
}
```

---

## 5. Plan Limits for Testers

Testers have `subscriptionPlan = 'yearly'` in the DB, so the existing `getPlanLimits('yearly')` logic applies:

- `practiceTestsPerMonth: 15` (effectively unlimited for beta period)
- `drillsPerMonth: Infinity`

No changes to `stripe-config.ts` are needed. The `currentPeriodEnd = 2099-12-31` ensures the existing "is subscription still active?" guards never expire for testers.

**Optional enhancement** (not required for v1): Add a `'tester'` entry to `STRIPE_PLANS` with `practiceTestsPerMonth: Infinity` if you want to differentiate tester analytics from paying yearly users. Out of scope for this spec.

---

## 6. Security Considerations

- **Rate limiting**: The `/api/promo/redeem` endpoint should be protected from brute-force. Since there is only one valid code, a simple approach is acceptable: the DB update is idempotent and there is no secret to guess beyond the code itself (DUCK19 is shared openly with testers). No additional rate limiting is required for v1.
- **Code normalization**: Normalize to uppercase on both client and server to prevent case-variant enumeration.
- **No financial impact**: DUCK19 creates no Stripe subscription and generates no invoice, so a compromised code cannot result in financial exposure.
- **Auth required**: The API returns 401 without a session, preventing anonymous DB writes.

---

## 7. Implementation Order

| Step | Task | File(s) |
|------|------|---------|
| 1 | Add `isTester` + `promoCodeUsed` to Prisma schema | `prisma/schema.prisma` |
| 2 | Run `prisma migrate dev` and push migration | Local → production DB |
| 3 | Regenerate Prisma client (`npx prisma generate`) | — |
| 4 | Create API route | `src/app/api/promo/redeem/route.ts` |
| 5 | Add promo UI to pricing page | `src/app/pricing/page.tsx` |
| 6 | Build, smoke test locally | — |
| 7 | Deploy to Azure | Standard deploy script |

---

## 8. Testing Checklist

- [ ] Unauthenticated user entering DUCK19 is redirected to sign-in, then returns to pricing
- [ ] Authenticated user enters `duck19` (lowercase) → succeeds
- [ ] Authenticated user enters `BADCODE` → sees "That code isn't valid."
- [ ] After redemption, `/api/subscription` returns `plan: 'yearly'`, `status: 'active'`
- [ ] Second redemption with DUCK19 returns `alreadyRedeemed: true` message, no DB error
- [ ] User with existing paid Stripe subscription redeems DUCK19 → `isTester: true`, Stripe IDs unchanged
- [ ] DB row shows `isTester = 1` and `promoCodeUsed = 'DUCK19'`
- [ ] `currentPeriodEnd` is far-future (2099), not null

---

## 9. Rollout Plan

This is a low-risk, additive change. No feature flags needed.  
Deploy during off-peak hours as a standard build. The DB migration adds nullable + default columns which are non-breaking on SQL Server.
