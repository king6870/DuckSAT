'use client'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

function hasMetaPixel(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq === 'function'
}

export function trackMetaPageView() {
  if (!hasMetaPixel()) return
  window.fbq?.('track', 'PageView')
}

export function trackMetaClickthrough(payload?: Record<string, string | number | boolean>) {
  if (!hasMetaPixel()) return
  window.fbq?.('trackCustom', 'AdClickthrough', payload ?? {})
}
