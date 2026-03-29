'use client'

import { usePageTracking, trackEvent } from '@/lib/tracking'
import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  usePageTracking()

  const { data: session } = useSession()
  const tracked = useRef(false)

  // Track login once per session
  useEffect(() => {
    if (session?.user?.id && !tracked.current) {
      tracked.current = true
      trackEvent('session', 'login', { userId: session.user.id })
    }
  }, [session])

  return <>{children}</>
}
