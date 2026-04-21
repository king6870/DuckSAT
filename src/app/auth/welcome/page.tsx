'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, FormEvent, Suspense } from 'react'
import Image from 'next/image'

function WelcomeForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [referralCode, setReferralCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)

  // Where to go after welcome (defaults to home)
  const next = searchParams.get('next') || '/'

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Pre-fill referral code from localStorage (set before Google OAuth redirect)
  // Also record QR source if the user came via /home/qr-code
  useEffect(() => {
    if (status === 'authenticated') {
      const pending = localStorage.getItem('pendingReferralCode')
      if (pending) {
        setReferralCode(pending.toUpperCase())
        localStorage.removeItem('pendingReferralCode')
      }

      const qrSource = localStorage.getItem('qr_source')
      if (qrSource) {
        fetch('/api/users/mark-qr-source', { method: 'POST' }).catch(() => {})
        localStorage.removeItem('qr_source')
      }
    }
  }, [status])

  async function handleContinue(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const code = referralCode.trim().toUpperCase()

    if (code) {
      setApplying(true)
      try {
        const res = await fetch('/api/referrals/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (data.error === 'referral_code_not_found') {
            setError('That referral code doesn\'t exist. Check with your friend and try again.')
            setLoading(false)
            setApplying(false)
            return
          }
          if (data.error === 'self_referral_not_allowed') {
            setError('You can\'t use your own referral code.')
            setLoading(false)
            setApplying(false)
            return
          }
          // referral_already_applied or invalid_referral_code — just continue
        }
      } catch {
        // Non-fatal — continue anyway
      }
      setApplying(false)
    }

    router.push(next)
  }

  function handleSkip() {
    router.push(next)
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const user = session!.user!
  const displayName = user.name || user.email?.split('@')[0] || 'there'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-gray-100">

          {/* Profile section */}
          <div className="text-center mb-8">
            {user.image ? (
              <div className="relative w-20 h-20 mx-auto mb-4">
                <Image
                  src={user.image}
                  alt={displayName}
                  fill
                  className="rounded-full object-cover border-4 border-white shadow-lg"
                  sizes="80px"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">
                  {displayName[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
            )}

            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Welcome, {displayName.split(' ')[0]}! 👋
            </h1>
            {user.email && (
              <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {user.email}
              </p>
            )}
          </div>

          {/* Referral code section */}
          <form onSubmit={handleContinue} className="space-y-5">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-5 border border-purple-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🎁</span>
                <label htmlFor="referralCode" className="text-sm font-semibold text-gray-800">
                  Got a referral code?
                </label>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Enter a friend&apos;s code and they&apos;ll earn a free practice test.
              </p>
              <input
                id="referralCode"
                type="text"
                value={referralCode}
                onChange={e => setReferralCode(e.target.value.toUpperCase())}
                maxLength={10}
                className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent font-mono tracking-widest text-center text-lg bg-white"
                placeholder="e.g. DJ83HJD2"
                autoComplete="off"
                spellCheck={false}
              />
              {error && (
                <p className="text-xs text-red-500 mt-2">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {applying ? 'Applying code…' : 'Continuing…'}
                </>
              ) : (
                referralCode.trim() ? 'Apply Code & Continue →' : 'Continue to DuckSAT →'
              )}
            </button>

            <button
              type="button"
              onClick={handleSkip}
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              Skip, just continue without a code
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function WelcomePage() {
  return (
    <Suspense>
      <WelcomeForm />
    </Suspense>
  )
}
