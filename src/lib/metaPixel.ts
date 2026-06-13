'use client'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

// Payload type: any JSON-serialisable values the Pixel accepts
type MetaPayload = Record<string, string | number | boolean | string[]>

function hasMetaPixel(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq === 'function'
}

export function trackMetaPageView() {
  if (!hasMetaPixel()) return
  window.fbq?.('track', 'PageView')
}

// Custom event — ad clickthrough attribution
export function trackMetaClickthrough(payload?: MetaPayload) {
  if (!hasMetaPixel()) return
  window.fbq?.('trackCustom', 'AdClickthrough', payload ?? {})
}

// Standard: Lead — user signals intent (CTA click)
export function trackMetaLead(payload?: MetaPayload) {
  if (!hasMetaPixel()) return
  window.fbq?.('track', 'Lead', payload ?? {})
}

// Standard: ViewContent — user views a key page (e.g. pricing)
export function trackMetaViewContent(payload?: MetaPayload) {
  if (!hasMetaPixel()) return
  window.fbq?.('track', 'ViewContent', payload ?? {})
}

// Standard: InitiateCheckout — user clicks a checkout/subscribe button
// num_items is recommended by Meta for this event
export function trackMetaInitiateCheckout(payload?: MetaPayload) {
  if (!hasMetaPixel()) return
  window.fbq?.('track', 'InitiateCheckout', payload ?? {})
}

// Standard: CompleteRegistration — user creates an account
// status (Boolean) is the Meta-defined parameter for this event
export function trackMetaCompleteRegistration(payload?: MetaPayload) {
  if (!hasMetaPixel()) return
  window.fbq?.('track', 'CompleteRegistration', payload ?? {})
}

// Standard: Purchase — confirmed paid subscription
// value + currency are required by Meta for Purchase
export function trackMetaPurchase(payload: { value: number; currency: string } & MetaPayload) {
  if (!hasMetaPixel()) return
  window.fbq?.('track', 'Purchase', payload)
}
