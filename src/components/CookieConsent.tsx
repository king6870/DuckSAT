'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'ducksat-cookie-consent'

type ConsentState = 'accepted' | 'declined' | null

export default function CookieConsent() {
  const [consent, setConsent] = useState<ConsentState>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ConsentState | null
    if (!stored) {
      // Small delay so the banner doesn't flash before hydration
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
    setConsent(stored)
    if (stored === 'accepted') loadAnalytics()
  }, [])

  function loadAnalytics() {
    // Only initialise Meta Pixel after consent is given.
    // The base fbq('init') in layout.tsx already ran — we just need to
    // allow future events. If the pixel was blocked, fire a PageView now.
    if (typeof window !== 'undefined' && typeof (window as Window & { fbq?: Function }).fbq === 'function') {
      ;(window as Window & { fbq: Function }).fbq('track', 'PageView')
    }
  }

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setConsent('accepted')
    setVisible(false)
    loadAnalytics()
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, 'declined')
    setConsent('declined')
    setVisible(false)
  }

  if (!visible || consent !== null) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 pointer-events-none"
    >
      <div className="max-w-3xl mx-auto pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-gray-600 leading-relaxed">
          <span className="font-semibold text-gray-900">We use cookies.</span>{' '}
          Strictly necessary cookies keep the site working. We also use optional analytics cookies (Meta Pixel) to
          understand how you find us.{' '}
          <Link href="/cookies" className="text-indigo-600 hover:underline whitespace-nowrap">
            Cookie Policy
          </Link>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Decline optional
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
