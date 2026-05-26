import 'dotenv/config'

import Stripe from 'stripe'

import { assertStripeRuntimeConfig, getStripeEnvReport } from '../src/lib/stripe-env'

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

async function main() {
  const env = assertStripeRuntimeConfig('Stripe live config validation', {
    requirePriceIds: true,
    requirePublishableKey: true,
  })

  if (env.secretKeyMode !== 'live') {
    throw new Error(`Expected STRIPE_SECRET_KEY to be live, received ${env.secretKeyMode}.`)
  }

  if (env.publishableKeyMode !== 'live') {
    throw new Error(`Expected NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to be live, received ${env.publishableKeyMode}.`)
  }

  const client = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })

  const [monthlyPrice, yearlyPrice] = await Promise.all([
    client.prices.retrieve(process.env.STRIPE_MONTHLY_PRICE_ID!),
    client.prices.retrieve(process.env.STRIPE_YEARLY_PRICE_ID!),
  ])

  if (!monthlyPrice.livemode || !yearlyPrice.livemode) {
    throw new Error('Configured Stripe price IDs are not live-mode prices.')
  }

  if (!monthlyPrice.active || !yearlyPrice.active) {
    throw new Error('Configured Stripe price IDs must both be active.')
  }

  if (monthlyPrice.recurring?.interval !== 'month') {
    throw new Error('STRIPE_MONTHLY_PRICE_ID does not point to a monthly recurring price.')
  }

  if (yearlyPrice.recurring?.interval !== 'year') {
    throw new Error('STRIPE_YEARLY_PRICE_ID does not point to a yearly recurring price.')
  }

  const warnings: string[] = []
  if (!env.webhookSecretPresent) {
    warnings.push('STRIPE_WEBHOOK_SECRET is missing. Checkout can start, but webhook-driven subscription updates will not verify until it is configured.')
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        env: getStripeEnvReport(),
        prices: {
          monthly: summarizePrice(monthlyPrice),
          yearly: summarizePrice(yearlyPrice),
        },
        warnings,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error('[Stripe Validation] Failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})