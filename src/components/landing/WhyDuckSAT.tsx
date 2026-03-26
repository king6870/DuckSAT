'use client'

import { X, Check } from 'lucide-react'
import ScrollReveal from './ScrollReveal'

const traditional = [
  'Passive video lectures',
  'One-size-fits-all curriculum',
  'No detailed feedback',
  'Boring and repetitive',
  '$100+/hour tutoring',
]

const ducksat = [
  'Active practice with instant feedback',
  'Adapts to your skill level',
  'AI-powered explanations for every question',
  'Engaging and goal-oriented',
  'Less than $6/hour',
]

export default function WhyDuckSAT() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <ScrollReveal>
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Why DuckSAT Works</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See how we compare to traditional SAT prep methods.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <ScrollReveal delay={0}>
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 h-full">
            <h3 className="text-lg font-bold text-red-800 mb-6">Traditional SAT Prep</h3>
            <ul className="space-y-4">
              {traditional.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 h-full">
            <h3 className="text-lg font-bold text-green-800 mb-6">DuckSAT</h3>
            <ul className="space-y-4">
              {ducksat.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
