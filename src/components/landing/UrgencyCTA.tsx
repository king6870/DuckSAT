'use client'

import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SALE } from '@/constants/pricing'
import CountdownTimer from './CountdownTimer'

interface UrgencyCTAProps {
  onGetStarted: () => void
  isAuthenticated?: boolean
}

export default function UrgencyCTA({ onGetStarted, isAuthenticated }: UrgencyCTAProps) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 sm:p-12 text-center text-white">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
          Ready to Hit Your Target Score?
        </h2>
        <p className="text-indigo-100 text-lg mb-6 max-w-2xl mx-auto">
          Join 500+ students already improving their SAT scores.
        </p>
        <div className="flex justify-center mb-8">
          <CountdownTimer label={`${SALE.name} ends in`} className="text-white [&_.countdown-digit]:bg-white/20 [&_.countdown-digit]:text-white" />
        </div>
        <Button
          onClick={onGetStarted}
          size="lg"
          className="bg-white text-indigo-700 font-bold hover:bg-gray-100 min-h-[56px] px-10 group"
        >
          {isAuthenticated ? 'Start Practicing' : 'Start Free Now'}
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
        <p className="text-indigo-200 text-sm mt-4">
          No credit card required &bull; Cancel anytime
        </p>
      </div>
    </section>
  )
}
