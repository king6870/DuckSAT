'use client'

import { Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PRICING, SALE } from '@/constants/pricing'
import CountdownTimer from './CountdownTimer'
import SocialProofBar from './SocialProofBar'
import ScrollReveal from './ScrollReveal'

interface PricingSectionProps {
  onCheckout: (plan: 'monthly' | 'yearly') => void
  onSignIn: () => void
  isAuthenticated: boolean
}

const freeBenefits = [
  '1 full practice test',
  '3 topic drills per day',
  'Basic progress tracking',
]

const proBenefits = [
  'Unlimited practice tests',
  'Unlimited topic drills',
  'AI-powered explanations',
  'Detailed analytics',
  'Adaptive difficulty',
  'Priority support',
]

export default function PricingSection({ onCheckout, onSignIn, isAuthenticated }: PricingSectionProps) {
  const saleName = SALE.name

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <ScrollReveal>
        <div className="text-center mb-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start free. Upgrade when you&apos;re ready. Cancel anytime.
          </p>
        </div>
        <div className="mb-12">
          <SocialProofBar variant="light" className="mt-6" />
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
        {/* Free Tier */}
        <ScrollReveal delay={0}>
          <div className="bg-white rounded-2xl p-8 shadow-lg border h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Free</h3>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-gray-900">$0</span>
              <span className="text-gray-500 ml-2">/ forever</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {freeBenefits.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 text-sm">{b}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={onSignIn}
            >
              {isAuthenticated ? 'Current Plan' : 'Get Started'}
            </Button>
          </div>
        </ScrollReveal>

        {/* Monthly — Featured */}
        <ScrollReveal delay={100}>
          <div className="relative bg-white rounded-2xl p-8 shadow-xl border-2 border-indigo-500 ring-2 ring-indigo-500 ring-offset-2 scale-[1.03] flex flex-col">
            {/* Sale badge */}
            <div className="absolute -top-3 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              {saleName}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-900">Monthly</h3>
            </div>
            <div className="mb-2">
              <span className="text-4xl font-extrabold text-gray-900">${PRICING.monthly.price}</span>
              <span className="text-gray-500 ml-2">/ month</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-sm text-gray-500">1 month free trial</span>
            </div>
            <div className="mb-6">
              <CountdownTimer label={`${saleName} ends in`} />
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {proBenefits.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 text-sm">{b}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="primary"
              size="lg"
              className="w-full cta-glow"
              onClick={() => isAuthenticated ? onCheckout('monthly') : onSignIn()}
            >
              Get Started
            </Button>
          </div>
        </ScrollReveal>

        {/* Yearly */}
        <ScrollReveal delay={200}>
          <div className="bg-white rounded-2xl p-8 shadow-lg border h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Yearly</h3>
            <div className="mb-2">
              <span className="text-4xl font-extrabold text-gray-900">${PRICING.yearly.price}</span>
              <span className="text-gray-500 ml-2">/ year</span>
            </div>
            <div className="flex items-center gap-2 mb-6">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                Best Value — Save ${PRICING.yearly.savings}
              </span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {proBenefits.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 text-sm">{b}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => isAuthenticated ? onCheckout('yearly') : onSignIn()}
            >
              Get Started
            </Button>
          </div>
        </ScrollReveal>
      </div>

      {/* Competitor Comparison */}
      <ScrollReveal delay={300}>
        <div className="mt-12 bg-gray-50 rounded-xl p-6 max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-500 mb-1">Private Tutor</div>
              <div className="text-lg font-bold text-gray-400">${PRICING.competitors.privateTutor}/hr</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Online Courses</div>
              <div className="text-lg font-bold text-gray-400">${PRICING.competitors.onlineCourse}+</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">DuckSAT</div>
              <div className="text-lg font-bold text-indigo-600">${PRICING.monthly.price}/mo</div>
              <Check className="w-5 h-5 text-green-500 mx-auto mt-1" />
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}
