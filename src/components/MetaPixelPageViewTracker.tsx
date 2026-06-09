'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackMetaPageView } from '@/lib/metaPixel'

export default function MetaPixelPageViewTracker() {
  const pathname = usePathname()
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }

    // Only track on route changes when user has accepted analytics cookies
    const consent = typeof localStorage !== 'undefined'
      ? localStorage.getItem('ducksat-cookie-consent')
      : null
    if (consent === 'accepted') {
      trackMetaPageView()
    }
  }, [pathname])

  return null
}
