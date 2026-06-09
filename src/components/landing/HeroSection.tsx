'use client'

import { ArrowRight, Zap } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import SocialProofBar from './SocialProofBar'
import { PRICING } from '@/constants/pricing'

interface HeroSectionProps {
  onGetStarted: () => void
  isAuthenticated?: boolean
}

export default function HeroSection({ onGetStarted, isAuthenticated }: HeroSectionProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
      <div className="text-center max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-indigo-200 mb-6 animate-fade-in-scale">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-indigo-700">AI-Powered SAT Prep</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight animate-slide-in-up">
          Increase Your SAT Score by{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            150+ Points
          </span>
        </h1>

        {/* Subtext */}
        <p
          className="text-xl sm:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto animate-slide-in-up"
          style={{ animationDelay: '200ms', animationFillMode: 'both' }}
        >
          AI-powered SAT prep that adapts to how you learn.
          Personalized practice. Real score improvement.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-slide-in-up"
          style={{ animationDelay: '400ms', animationFillMode: 'both' }}
        >
          <Button
            onClick={onGetStarted}
            variant="primary"
            size="lg"
            className="group min-h-[56px] px-10 cta-glow"
          >
            {isAuthenticated ? 'Start Practicing' : 'Start Free'}
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>

          {!isAuthenticated ? (
            <Link
              href="/pricing?autoCheckout=monthly"
              className="inline-flex items-center gap-2 min-h-[56px] px-8 rounded-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Zap className="w-4 h-4" />
              Go Premium – ${PRICING.monthly.price}/mo
            </Link>
          ) : (
            <Button
              variant="outline"
              size="lg"
              className="min-h-[56px] px-8"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See How It Works
            </Button>
          )}
        </div>

        {/* Trust strip */}
        <div
          className="animate-slide-in-up"
          style={{ animationDelay: '600ms', animationFillMode: 'both' }}
        >
          <SocialProofBar variant="light" />
        </div>
      </div>
    </section>
  )
}
