'use client'

import { CheckCircle2 } from 'lucide-react'
import { PRICING } from '@/constants/pricing'
import ScrollReveal from './ScrollReveal'

const items = [
  '2,000+ SAT Practice Questions',
  'AI-Powered Explanations for Every Question',
  '6 Full-Length Practice Tests',
  'Personalized Study Plan',
  'Real-Time Progress Tracking',
  'Adaptive Difficulty System',
  'Detailed Score Analytics',
  'Topic-Specific Drills',
  'Mobile-Friendly Interface',
  'New Questions Added Weekly',
]

export default function ValueStack() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <ScrollReveal>
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Everything You Get with DuckSAT</h2>
        </div>
      </ScrollReveal>

      <div className="max-w-2xl mx-auto">
        {items.map((item, i) => (
          <ScrollReveal key={item} delay={i * 50}>
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              <span className="text-lg text-gray-800">{item}</span>
            </div>
          </ScrollReveal>
        ))}

        <ScrollReveal delay={items.length * 50}>
          <div className="text-center mt-10">
            <p className="text-lg text-gray-600">
              <span className="text-2xl font-extrabold text-gray-900">All yours for just ${PRICING.monthly.price}/mo</span>
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
