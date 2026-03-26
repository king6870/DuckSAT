'use client'

import { Brain, Target, TrendingUp } from 'lucide-react'
import ScrollReveal from './ScrollReveal'

const steps = [
  {
    num: 1,
    icon: Brain,
    title: 'Learn',
    description: 'AI-powered lessons and detailed explanations break down every concept so you truly understand the material.',
  },
  {
    num: 2,
    icon: Target,
    title: 'Practice',
    description: 'Adaptive questions adjust to your skill level, giving you the right challenge at the right time.',
  },
  {
    num: 3,
    icon: TrendingUp,
    title: 'Improve',
    description: 'Personalized feedback and weakness detection guide your study plan so every minute counts.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <ScrollReveal>
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How DuckSAT Works</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Three steps to your target score</p>
        </div>
      </ScrollReveal>

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Connecting line (desktop only) */}
        <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-0.5 border-t-2 border-dashed border-indigo-200" />

        {steps.map((step, i) => (
          <ScrollReveal key={step.num} delay={i * 150}>
            <div className="relative bg-white rounded-2xl p-8 shadow-lg border text-center hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-5">
                {step.num}
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
