  'use client'

import { BookOpen, BarChart3, RefreshCcw } from 'lucide-react'
import ScrollReveal from './ScrollReveal'

const segments = [
  {
    icon: BookOpen,
    title: 'Just Starting',
    message: 'Build a strong foundation with structured lessons and adaptive practice that meets you where you are.',
  },
  {
    icon: BarChart3,
    title: 'Already Studying',
    message: 'Break through your score plateau with AI-powered weakness detection and targeted drills.',
  },
  {
    icon: RefreshCcw,
    title: 'Retaking the SAT',
    message: 'Focus on your specific weak areas with precision practice and watch your score climb.',
  },
]

export default function UserSegmentation() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <ScrollReveal>
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Who Is DuckSAT For?</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            No matter where you are in your SAT journey, DuckSAT adapts to you.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {segments.map((s, i) => (
          <ScrollReveal key={s.title} delay={i * 150}>
            <div className="bg-white rounded-2xl p-8 shadow-lg border text-center hover:shadow-xl transition-shadow h-full">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-5">
                <s.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
              <p className="text-gray-600 leading-relaxed">{s.message}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
