export type StripeKeyMode = 'live' | 'test' | 'missing' | 'invalid'

export interface StripeEnvReport {
  secretKeyMode: StripeKeyMode
  publishableKeyMode: StripeKeyMode
  webhookSecretPresent: boolean
  monthlyPriceIdPresent: boolean
  yearlyPriceIdPresent: boolean
  checkoutReady: boolean
  webhookReady: boolean
}

function classifyStripeKey(value: string | undefined): StripeKeyMode {
  if (!value) {
    return 'missing'
  }

  if (value.startsWith('sk_live_') || value.startsWith('pk_live_')) {
    return 'live'
  }

  if (value.startsWith('sk_test_') || value.startsWith('pk_test_')) {
    return 'test'
  }

  return 'invalid'
}

export function getStripeEnvReport(): StripeEnvReport {
  const isProduction = process.env.NODE_ENV === 'production'
  const secretKeyMode = classifyStripeKey(process.env.STRIPE_SECRET_KEY)
  const publishableKeyMode = classifyStripeKey(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  const webhookSecretPresent = Boolean(process.env.STRIPE_WEBHOOK_SECRET)
  const monthlyPriceIdPresent = Boolean(process.env.STRIPE_MONTHLY_PRICE_ID)
  const yearlyPriceIdPresent = Boolean(process.env.STRIPE_YEARLY_PRICE_ID)

  const secretKeyReady = isProduction ? secretKeyMode === 'live' : secretKeyMode !== 'missing' && secretKeyMode !== 'invalid'
  const publishableKeyReady = isProduction ? publishableKeyMode === 'live' : publishableKeyMode !== 'missing' && publishableKeyMode !== 'invalid'

  return {
    secretKeyMode,
    publishableKeyMode,
    webhookSecretPresent,
    monthlyPriceIdPresent,
    yearlyPriceIdPresent,
    checkoutReady: secretKeyReady && publishableKeyReady && monthlyPriceIdPresent && yearlyPriceIdPresent,
    webhookReady: secretKeyReady && webhookSecretPresent,
  }
}

interface StripeRuntimeRequirements {
  requirePriceIds?: boolean
  requirePublishableKey?: boolean
  requireWebhookSecret?: boolean
}

export function assertStripeRuntimeConfig(
  context: string,
  requirements: StripeRuntimeRequirements = {}
): StripeEnvReport {
  const report = getStripeEnvReport()
  const isProduction = process.env.NODE_ENV === 'production'

  if (report.secretKeyMode === 'missing') {
    throw new Error(`[Stripe Config] STRIPE_SECRET_KEY is not set for ${context}.`)
  }

  if (report.secretKeyMode === 'invalid') {
    throw new Error(`[Stripe Config] STRIPE_SECRET_KEY has an invalid format for ${context}.`)
  }

  if (isProduction && report.secretKeyMode !== 'live') {
    throw new Error(
      `[Stripe Config] STRIPE_SECRET_KEY must be a live key in production for ${context}; received ${report.secretKeyMode}.`
    )
  }

  if (requirements.requirePublishableKey) {
    if (report.publishableKeyMode === 'missing') {
      throw new Error(`[Stripe Config] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set for ${context}.`)
    }

    if (report.publishableKeyMode === 'invalid') {
      throw new Error(`[Stripe Config] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY has an invalid format for ${context}.`)
    }

    if (isProduction && report.publishableKeyMode !== 'live') {
      throw new Error(
        `[Stripe Config] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a live key in production for ${context}; received ${report.publishableKeyMode}.`
      )
    }
  }

  if (requirements.requirePriceIds) {
    if (!report.monthlyPriceIdPresent) {
      throw new Error(`[Stripe Config] STRIPE_MONTHLY_PRICE_ID is not set for ${context}.`)
    }

    if (!report.yearlyPriceIdPresent) {
      throw new Error(`[Stripe Config] STRIPE_YEARLY_PRICE_ID is not set for ${context}.`)
    }
  }

  if (requirements.requireWebhookSecret && !report.webhookSecretPresent) {
    throw new Error(`[Stripe Config] STRIPE_WEBHOOK_SECRET is not set for ${context}.`)
  }

  return report
}