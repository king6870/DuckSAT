'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, ArrowRight, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ScrollReveal from './ScrollReveal'
import Link from 'next/link'

const DEMO_QUESTION = {
  stem: 'A line in the xy-plane has a slope of 3 and passes through the point (2, 7). Which of the following is the equation of the line?',
  choices: [
    { id: 'A', text: 'y = 3x + 13' },
    { id: 'B', text: 'y = 3x + 1' },
    { id: 'C', text: 'y = 3x − 1' },
    { id: 'D', text: 'y = 3x − 13' },
  ],
  answerId: 'B',
  explanation:
    'Use the point-slope form: y − y₁ = m(x − x₁). Substituting m = 3 and the point (2, 7):\n\ny − 7 = 3(x − 2)\ny − 7 = 3x − 6\ny = 3x + 1\n\nYou can verify: when x = 2, y = 3(2) + 1 = 7 ✓. The correct answer is B.',
  difficulty: 'Medium',
  topic: 'Algebra — Linear Equations',
}

export default function HomepageQuestionDemo() {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const isCorrect = submitted && selected === DEMO_QUESTION.answerId

  const handleSubmit = () => {
    if (!selected) return
    setSubmitted(true)
  }

  const handleReset = () => {
    setSelected(null)
    setSubmitted(false)
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <ScrollReveal>
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-full mb-4">
            <span className="w-2 h-2 bg-indigo-500 rounded-full" />
            <span className="text-sm font-semibold text-indigo-700">Try a real SAT question — no account needed</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Experience DuckSAT for Free
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Answer a real SAT-style question and see the instant, step-by-step explanation — just like our full platform.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Question header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-indigo-100 uppercase tracking-wide">
              {DEMO_QUESTION.topic}
            </span>
            <span className="text-xs font-medium bg-white/20 text-white px-3 py-1 rounded-full">
              {DEMO_QUESTION.difficulty}
            </span>
          </div>

          <div className="p-6 sm:p-8">
            {/* Stem */}
            <p className="text-gray-900 text-lg font-medium leading-relaxed mb-6">
              {DEMO_QUESTION.stem}
            </p>

            {/* Answer choices */}
            <div className="space-y-3 mb-6">
              {DEMO_QUESTION.choices.map((choice) => {
                const isSelected = selected === choice.id
                const isAnswer = choice.id === DEMO_QUESTION.answerId

                let choiceClass =
                  'flex items-center gap-3 w-full rounded-xl border-2 px-4 py-3 text-left transition-all duration-200 cursor-pointer '

                if (!submitted) {
                  choiceClass += isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : 'border-gray-200 bg-white text-gray-800 hover:border-indigo-300 hover:bg-indigo-50/50'
                } else {
                  if (isAnswer) {
                    choiceClass += 'border-green-500 bg-green-50 text-green-900'
                  } else if (isSelected && !isAnswer) {
                    choiceClass += 'border-red-400 bg-red-50 text-red-900'
                  } else {
                    choiceClass += 'border-gray-200 bg-white text-gray-500'
                  }
                }

                return (
                  <button
                    key={choice.id}
                    className={choiceClass}
                    onClick={() => !submitted && setSelected(choice.id)}
                    disabled={submitted}
                    aria-pressed={isSelected}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        !submitted
                          ? isSelected
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                          : isAnswer
                          ? 'bg-green-500 text-white'
                          : isSelected
                          ? 'bg-red-400 text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {choice.id}
                    </span>
                    <span className="text-sm sm:text-base">{choice.text}</span>
                    {submitted && isAnswer && (
                      <CheckCircle className="ml-auto w-5 h-5 text-green-500 shrink-0" />
                    )}
                    {submitted && isSelected && !isAnswer && (
                      <XCircle className="ml-auto w-5 h-5 text-red-400 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Submit / result */}
            {!submitted ? (
              <Button
                onClick={handleSubmit}
                disabled={!selected}
                variant="primary"
                className="w-full"
                size="lg"
              >
                Submit Answer
              </Button>
            ) : (
              <div className="space-y-4">
                {/* Result banner */}
                <div
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                    isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {isCorrect ? (
                    <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400 shrink-0" />
                  )}
                  <span
                    className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}
                  >
                    {isCorrect ? 'Correct! Great work.' : `Incorrect. The correct answer is ${DEMO_QUESTION.answerId}.`}
                  </span>
                </div>

                {/* Explanation */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />
                    <span className="font-semibold text-amber-800 text-sm">Step-by-Step Explanation</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {DEMO_QUESTION.explanation}
                  </p>
                </div>

                <button
                  onClick={handleReset}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2 transition-colors"
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* CTA footer */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-t border-indigo-100 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Like what you see?</p>
              <p className="text-gray-600 text-sm">Get access to 2,000+ SAT questions with AI explanations.</p>
            </div>
            <Button asChild variant="primary" size="sm" className="shrink-0 group">
              <Link href="/auth/signin">
                Try more questions — it&apos;s free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}
