'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Check, Sparkles, Crown, Zap, Loader2, Shield } from 'lucide-react'
import { PRICING, SALE } from '@/constants/pricing'
import CountdownTimer from '@/components/landing/CountdownTimer'
import SocialProofBar from '@/components/landing/SocialProofBar'

interface SubscriptionData {
  plan: string
  status: string
  usage: {
    practiceTests: { used: number; limit: number }
    drills: { used: number; limit: number }
  }
  stripeCustomerId: string | null
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}

function PricingContent() {
  const { data: session, status: authStatus } = useSession()
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')
  const saleName = SALE.name

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetch('/api/subscription')
        .then(res => res.json())
        .then(data => {
          if (!data.error) setSubscription(data)
        })
        .catch(() => {})
    }
  }, [authStatus])

  async function handleCheckout(plan: 'monthly' | 'yearly') {
    if (!session) {
      window.location.href = '/auth/signin?callbackUrl=/pricing'
      return
    }
    setCheckoutLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // Handle error silently
    } finally {
      setCheckoutLoading(null)
    }
  }

  async function handleManageBilling() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }

  const currentPlan = subscription?.plan || 'free'
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Success/Cancel banners */}
        {success && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-800 font-semibold">🎉 Welcome to DuckSAT Pro! Your subscription is now active.</p>
          </div>
        )}
        {canceled && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-amber-800">Checkout was canceled. No charges were made.</p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start free and upgrade when you&apos;re ready to unlock your full SAT potential.
          </p>
        </div>

        <SocialProofBar variant="light" className="mb-12" />

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
          {/* Free Plan */}
          <div className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all hover:shadow-xl ${
            currentPlan === 'free' && isActive ? 'border-gray-400' : 'border-gray-200'
          } p-8 flex flex-col`}>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-500 uppercase tracking-wide">Free</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500">/forever</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8 flex-grow">
              <PricingFeature>1 practice test per month</PricingFeature>
              <PricingFeature>3 topic drills per month</PricingFeature>
              <PricingFeature>Basic progress tracking</PricingFeature>
              <PricingFeature>All question explanations</PricingFeature>
            </ul>

            {currentPlan === 'free' ? (
              <button disabled className="w-full py-3 px-6 rounded-xl font-semibold bg-gray-100 text-gray-400 cursor-not-allowed">
                Current Plan
              </button>
            ) : (
              <button
                onClick={handleManageBilling}
                disabled={loading}
                className="w-full py-3 px-6 rounded-xl font-semibold bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Downgrade'}
              </button>
            )}
          </div>

          {/* Monthly Plan — Most Popular */}
          <div className={`relative bg-white rounded-2xl shadow-xl border-2 transition-all hover:shadow-2xl ${
            currentPlan === 'monthly' && isActive ? 'border-indigo-500' : 'border-indigo-400'
          } p-8 flex flex-col scale-[1.02] md:scale-105`}>
            {/* Sale Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">
                Most Popular
              </span>
            </div>
            <div className="absolute -top-3 right-4">
              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">{saleName}</span>
            </div>

            <div className="mb-4 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-indigo-600 uppercase tracking-wide">Monthly</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-gray-900">${PRICING.monthly.price}</span>
                <span className="text-gray-500">/month</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-sm text-gray-500">1 month free trial</span>
              </div>
            </div>

            <div className="mb-6">
              <CountdownTimer label={`${saleName} ends in`} />
            </div>

            <ul className="space-y-4 mb-8 flex-grow">
              <PricingFeature highlight>10+ free practice tests</PricingFeature>
              <PricingFeature highlight>Unlimited topic drills</PricingFeature>
              <PricingFeature>AI-powered explanations</PricingFeature>
              <PricingFeature>Detailed analytics</PricingFeature>
              <PricingFeature>Adaptive difficulty</PricingFeature>
              <PricingFeature>Priority support</PricingFeature>
            </ul>

            {currentPlan === 'monthly' && isActive ? (
              <button
                onClick={handleManageBilling}
                disabled={loading}
                className="w-full py-3 px-6 rounded-xl font-semibold bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Manage Subscription'}
              </button>
            ) : (
              <button
                onClick={() => handleCheckout('monthly')}
                disabled={checkoutLoading === 'monthly'}
                className="w-full py-3 px-6 rounded-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl cta-glow"
              >
                {checkoutLoading === 'monthly' ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Get Started'
                )}
              </button>
            )}
          </div>

          {/* Yearly Plan — Best Value */}
          <div className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all hover:shadow-xl ${
            currentPlan === 'yearly' && isActive ? 'border-amber-500' : 'border-gray-200'
          } p-8 flex flex-col`}>
            {/* Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">
                Best Value
              </span>
            </div>

            <div className="mb-6 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-amber-600 uppercase tracking-wide">Yearly</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-gray-900">${PRICING.yearly.price}</span>
                <span className="text-gray-500">/year</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                  Save ${PRICING.yearly.savings} — ${PRICING.yearly.perMonth}/mo
                </span>
              </div>
            </div>

            <ul className="space-y-4 mb-8 flex-grow">
              <PricingFeature highlight>10+ free practice tests</PricingFeature>
              <PricingFeature highlight>Unlimited topic drills</PricingFeature>
              <PricingFeature>AI-powered explanations</PricingFeature>
              <PricingFeature>Detailed analytics</PricingFeature>
              <PricingFeature>Adaptive difficulty</PricingFeature>
              <PricingFeature>Priority support</PricingFeature>
            </ul>

            {currentPlan === 'yearly' && isActive ? (
              <button
                onClick={handleManageBilling}
                disabled={loading}
                className="w-full py-3 px-6 rounded-xl font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Manage Subscription'}
              </button>
            ) : (
              <button
                onClick={() => handleCheckout('yearly')}
                disabled={checkoutLoading === 'yearly'}
                className="w-full py-3 px-6 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
              >
                {checkoutLoading === 'yearly' ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Subscribe Yearly'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Competitor Comparison */}
        <div className="mt-12 bg-white rounded-xl p-6 shadow-sm border border-gray-100 max-w-3xl mx-auto">
          <h3 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Compare the cost</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-500 mb-1">Private Tutor</div>
              <div className="text-lg font-bold text-gray-400">${PRICING.competitors.privateTutor}/hr</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Other Online Prep</div>
              <div className="text-lg font-bold text-gray-400">${PRICING.competitors.onlineCourse}+</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">DuckSAT</div>
              <div className="text-lg font-bold text-indigo-600">${PRICING.monthly.price}/mo</div>
              <Check className="w-5 h-5 text-green-500 mx-auto mt-1" />
            </div>
          </div>
        </div>

        {/* Guarantee Badge */}
        <div className="mt-12 max-w-md mx-auto text-center">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-green-200 rounded-2xl p-6">
            <Shield className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <p className="font-bold text-gray-900 mb-1">Score Improvement Guarantee</p>
            <p className="text-sm text-gray-600">Improve your score or get a full refund. No questions asked.</p>
          </div>
        </div>

        {/* Manage billing for existing subscribers */}
        {subscription?.stripeCustomerId && (
          <div className="text-center mt-8">
            <button
              onClick={handleManageBilling}
              disabled={loading}
              className="text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-4 transition-colors"
            >
              {loading ? 'Opening billing portal...' : 'Manage billing & invoices'}
            </button>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <FaqItem question="Can I cancel anytime?">
              Yes! You can cancel your subscription at any time. You&apos;ll continue to have access until the end of your current billing period.
            </FaqItem>
            <FaqItem question="How is DuckSAT different from other SAT prep?">
              DuckSAT uses AI-powered adaptive learning that adjusts to your skill level in real time. Instead of passive video lectures, you actively practice with questions tailored to your weaknesses — the most effective way to improve your score.
            </FaqItem>
            <FaqItem question="Can I switch between monthly and yearly?">
              Absolutely. You can upgrade or downgrade your plan at any time through the billing portal.
            </FaqItem>
            <FaqItem question="What counts as a 'practice test use'?">
              Each time you start a practice test, it counts as one use. You can retake the same test and it counts as a separate use.
            </FaqItem>
          </div>
        </div>
      </div>
    </div>
  )
}

function PricingFeature({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${highlight ? 'text-indigo-600' : 'text-green-500'}`} />
      <span className={`text-sm ${highlight ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{children}</span>
    </li>
  )
}

function FaqItem({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-2">{question}</h3>
      <p className="text-gray-600 text-sm">{children}</p>
    </div>
  )
}
