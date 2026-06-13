'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, FormEvent, useEffect, Suspense } from 'react'
import { Zap, Check, Loader2 } from 'lucide-react'
import { PRICING } from '@/constants/pricing'
import { trackMetaCompleteRegistration } from '@/lib/metaPixel'

const USERNAME_RE = /^[a-zA-Z0-9_]+$/

function SignupSubscribeForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()

  const planParam = searchParams.get('plan') as 'monthly' | 'yearly' | null
  const [plan, setPlan] = useState<'monthly' | 'yearly'>(planParam === 'yearly' ? 'yearly' : 'monthly')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loadingStep, setLoadingStep] = useState<null | 'account' | 'checkout'>(null)

  // Already authenticated — skip signup, go straight to autoCheckout
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(`/pricing?autoCheckout=${plan}`)
    }
  }, [status, plan, router])

  function validate(): string {
    if (!username || username.length < 3 || username.length > 20 || !USERNAME_RE.test(username)) {
      return 'Username: 3–20 characters, letters/numbers/underscores only.'
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters.'
    }
    return ''
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setLoadingStep('account')

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (res.status !== 201) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'username_taken') setError('That username is already taken.')
        else if (data.error === 'invalid_username') setError('Username must be 3–20 characters (letters, numbers, underscores).')
        else if (data.error === 'password_too_short') setError('Password must be at least 8 characters.')
        else setError('Something went wrong. Please try again.')
        setLoadingStep(null)
        return
      }

      const authResult = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (!authResult?.ok) {
        setError('Account created but sign-in failed. Please sign in manually.')
        setLoadingStep(null)
        router.push('/auth/signin')
        return
      }

      trackMetaCompleteRegistration({ status: true, method: 'credentials', plan })
      // Use the existing, battle-tested autoCheckout flow on the pricing page
      // so we don't race against the session cookie becoming visible to /api/stripe/checkout
      setLoadingStep('checkout')
      router.push(`/pricing?autoCheckout=${plan}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoadingStep(null)
    }
  }

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-gray-100">
          {/* Brand */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              DuckSAT
            </h1>
            <p className="text-gray-600">Create your account and start improving your SAT score</p>
          </div>

          {/* Plan selector */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">Choose your plan</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlan('monthly')}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${
                  plan === 'monthly'
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="font-bold text-gray-900">
                  ${PRICING.monthly.price}<span className="font-normal text-sm text-gray-500">/mo</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">Monthly</div>
                {plan === 'monthly' && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600 font-semibold">
                    <Check className="w-3 h-3" /> Selected
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPlan('yearly')}
                className={`rounded-2xl border-2 p-4 text-left transition-all relative ${
                  plan === 'yearly'
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className="absolute -top-2.5 right-3 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  Save ${PRICING.yearly.savings}
                </div>
                <div className="font-bold text-gray-900">
                  ${PRICING.yearly.perMonth}<span className="font-normal text-sm text-gray-500">/mo</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">Yearly · ${PRICING.yearly.price}/yr</div>
                {plan === 'yearly' && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600 font-semibold">
                    <Check className="w-3 h-3" /> Selected
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="bg-indigo-50 rounded-2xl p-4 mb-6">
            <ul className="grid grid-cols-2 gap-2 text-sm text-indigo-800">
              {['Unlimited practice tests', 'Topic drills', 'Progress tracking', 'AI explanations'].map(f => (
                <li key={f} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Credentials form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                maxLength={20}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="your_username"
              />
              <p className="text-xs text-gray-400 mt-1">3–20 characters, letters/numbers/underscores</p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-400 mt-1">Min 8 characters</p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>
            )}

            <button
              type="submit"
              disabled={!!loadingStep}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 px-6 rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingStep === 'account' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account…
                </>
              ) : loadingStep === 'checkout' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Opening checkout…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Create Account &amp; Subscribe
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-sm pt-1">
              <a href="/auth/signup" className="text-gray-400 hover:text-gray-600">
                Just create a free account
              </a>
              <a href="/auth/signin" className="text-blue-600 hover:underline font-medium">
                Sign in
              </a>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          By creating an account, you agree to our{' '}
          <a href="/terms" className="underline">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="underline">Privacy Policy</a>.
          Cancel anytime.
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    }>
      <SignupSubscribeForm />
    </Suspense>
  )
}
