'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'ducksat-cookie-consent'
const FB_PIXEL_ID = '1939262350066294'

type ConsentState = 'accepted' | 'declined' | null

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    _fbq?: (...args: unknown[]) => void
  }
}

function loadMetaPixel() {
  if (typeof window === 'undefined') return

  // If fbq is already loaded (from head script on returning visitors), just track
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'PageView')
    return
  }

  // First-time acceptance: dynamically load the pixel and initialize
  const f = window as typeof window & { fbq: typeof window.fbq; _fbq?: typeof window.fbq }
  const n: ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void
    queue: unknown[][]
    loaded: boolean
    version: string
    push: (...args: unknown[]) => void
  } = function (...args: unknown[]) {
    if (n.callMethod) {
      n.callMethod(...args)
    } else {
      n.queue.push(args)
    }
  } as typeof n
  n.queue = []
  n.loaded = true
  n.version = '2.0'
  n.push = n

  f.fbq = n
  if (!f._fbq) f._fbq = n

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)

  window.fbq?.('init', FB_PIXEL_ID)
  window.fbq?.('track', 'PageView')
}

export default function CookieConsent() {
  const [consent, setConsent] = useState<ConsentState>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ConsentState | null
    if (!stored) {
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
    setConsent(stored)
    if (stored === 'accepted') loadMetaPixel()
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setConsent('accepted')
    setVisible(false)
    loadMetaPixel()
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
