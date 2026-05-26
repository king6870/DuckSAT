import { NextResponse } from 'next/server'
import Stripe from 'stripe'

import { stripe } from '@/lib/stripe'
import { assertStripeRuntimeConfig, getStripeEnvReport } from '@/lib/stripe-env'

export const dynamic = 'force-dynamic'

function summarizePrice(price: Stripe.Price) {
  return {
    id: price.id,
    livemode: price.livemode,
    active: price.active,
    currency: price.currency,
    interval: price.recurring?.interval ?? null,
    unitAmount: price.unit_amount,
  }
}

export async function GET() {
  const env = getStripeEnvReport()

  try {
    assertStripeRuntimeConfig('Stripe Status', {
      requirePriceIds: true,
      requirePublishableKey: true,
    })

    const [monthlyPrice, yearlyPrice] = await Promise.all([
      stripe.prices.retrieve(process.env.STRIPE_MONTHLY_PRICE_ID!),
      stripe.prices.retrieve(process.env.STRIPE_YEARLY_PRICE_ID!),
    ])

    return NextResponse.json({
      ok: true,
      env,
      prices: {
        monthly: summarizePrice(monthlyPrice),
        yearly: summarizePrice(yearlyPrice),
      },
      liveCheckoutReady:
        env.checkoutReady &&
        monthlyPrice.livemode &&
        yearlyPrice.livemode &&
        monthlyPrice.active &&
        yearlyPrice.active,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Stripe status error'
    console.error('[Stripe Status] Error:', error)

    return NextResponse.json(
      {
        ok: false,
        env,
        error: message,
      },
      { status: 500 }
    )
  }
}