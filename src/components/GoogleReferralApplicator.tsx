'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

const STORAGE_KEY = 'pendingReferralCode'

/**
 * Silently applies a pending referral code stored in localStorage after Google OAuth sign-in.
 * Mounted once in the root layout; runs whenever the session becomes authenticated.
 */
export function GoogleReferralApplicator() {
  const { status } = useSession()
  const applied = useRef(false)

  useEffect(() => {
    if (status !== 'authenticated' || applied.current) return

    const code = localStorage.getItem(STORAGE_KEY)
    if (!code) return

    applied.current = true
    localStorage.removeItem(STORAGE_KEY)

    fetch('/api/referrals/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }).catch(() => {
      // Non-fatal: referral already applied or invalid code
    })
  }, [status])

  return null
}
