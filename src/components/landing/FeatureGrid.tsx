'use client'

import { BookOpen, Brain, ClipboardList, BarChart3, Target, GraduationCap } from 'lucide-react'
import ScrollReveal from './ScrollReveal'

const features = [
  { icon: BookOpen, metric: '2,000+', title: 'SAT Questions', description: 'Covering every topic on the Digital SAT' },
  { icon: Brain, metric: 'Instant', title: 'AI Explanations', description: 'Step-by-step breakdowns for every question' },
  { icon: ClipboardList, metric: '6', title: 'Full Practice Tests', description: 'Timed, full-length tests matching the real exam' },
  { icon: BarChart3, metric: 'Real-time', title: 'Progress Tracking', description: 'See your strengths and weaknesses at a glance' },
  { icon: Target, metric: 'Adaptive', title: 'Smart Practice', description: 'Questions that adjust to your skill level' },
  { icon: GraduationCap, metric: 'Custom', title: 'Study Plan', description: 'Personalized path to your target score' },
]

export default function FeatureGrid() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <ScrollReveal>
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Everything You Get</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Tools designed to maximize your score in minimum time.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <ScrollReveal key={f.title} delay={i * 100}>
            <div className="bg-white rounded-xl p-6 shadow border hover:shadow-xl hover:scale-[1.03] transition-all duration-300 h-full">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{f.metric}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600">{f.description}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}
