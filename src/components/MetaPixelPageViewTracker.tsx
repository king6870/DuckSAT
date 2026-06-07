'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackMetaPageView } from '@/lib/metaPixel'

export default function MetaPixelPageViewTracker() {
  const pathname = usePathname()
  const firstRender = useRef(true)

  useEffect(() => {
    // Initial full page load already fires PageView from base pixel script.
    if (firstRender.current) {
      firstRender.current = false
      return
    }

    trackMetaPageView()
  }, [pathname])

  return null
}