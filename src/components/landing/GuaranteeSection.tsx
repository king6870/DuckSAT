'use client'

import { Shield } from 'lucide-react'
import ScrollReveal from './ScrollReveal'

export default function GuaranteeSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <ScrollReveal>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-green-200 rounded-2xl p-8 sm:p-12 max-w-xl mx-auto text-center">
          <Shield className="w-16 h-16 text-green-600 mx-auto mb-5" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Score Improvement Guarantee</h2>
          <p className="text-gray-600 mb-4">
            Improve your score or get a full refund. No questions asked.
          </p>
          <a href="/terms" className="text-sm text-green-600 underline hover:text-green-700 transition-colors">
            See terms
          </a>
        </div>
      </ScrollReveal>
    </section>
  )
}
