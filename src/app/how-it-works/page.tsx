"use client"

import Link from "next/link"
import { Brain, Cpu, CheckCircle2, BarChart3, Sparkles, Shield } from "lucide-react"

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-indigo-200 mb-6">
          <Cpu className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-700">How It Works</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
          Smart Questions,{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Real Results
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Every question on DuckSAT goes through a rigorous creation and review process to make 
          sure you&apos;re practicing with material that matches the real Digital SAT.
        </p>
      </section>

      {/* Pipeline Steps */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">Our Question Pipeline</h2>
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-indigo-100 p-6 sm:p-8 flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                1
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                AI-Powered Generation
              </h3>
              <p className="text-gray-600 leading-relaxed">
                We use advanced AI models to generate SAT-style questions across all categories — 
                algebra, geometry, reading comprehension, grammar, and more. Each question is crafted 
                with a passage (when applicable), four answer choices, a correct answer, and a detailed explanation.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-cyan-100 p-6 sm:p-8 flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                2
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-600" />
                Quality Review
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Every generated question goes through a review process. We check for accuracy, 
                clarity, appropriate difficulty, and alignment with College Board standards. 
                Questions that don&apos;t meet our standards are rejected or revised.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-green-100 p-6 sm:p-8 flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg">
                3
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-600" />
                Diagram & Visual Generation
              </h3>
              <p className="text-gray-600 leading-relaxed">
                For math questions that need visual aids — graphs, geometric figures, coordinate 
                planes, bar charts — we automatically generate high-quality diagrams using a 
                template-based rendering system. Over 25% of our questions include diagrams.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-6 sm:p-8 flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                4
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
                Categorization & Difficulty Tagging
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Each question is tagged with its module type (Math or Reading & Writing), category, 
                subtopic, and difficulty level. This allows our platform to serve you the right 
                questions based on what you need to practice.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100 p-6 sm:p-8 flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg">
                5
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Adaptive Delivery
              </h3>
              <p className="text-gray-600 leading-relaxed">
                When you take a practice test, our system adapts to your performance. If you ace 
                Module 1, Module 2 gets harder — just like the real Digital SAT. For topic drills, 
                questions are shuffled and answer positions are randomized so you&apos;re always challenged.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-20">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 sm:p-12 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">By the Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-1">5,400+</div>
              <div className="text-indigo-200 text-sm font-medium">Total Questions</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-1">1,400+</div>
              <div className="text-indigo-200 text-sm font-medium">With Diagrams</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-1">8</div>
              <div className="text-indigo-200 text-sm font-medium">Categories</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold mb-1">3</div>
              <div className="text-indigo-200 text-sm font-medium">Difficulty Levels</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Nav */}
      <footer className="border-t border-gray-200 bg-white/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
          <Link href="/about" className="hover:text-indigo-600 transition-colors">About</Link>
          <Link href="/how-it-works" className="text-indigo-600 font-semibold">How It Works</Link>
          <Link href="/our-goal" className="hover:text-indigo-600 transition-colors">Our Goal</Link>
          <Link href="/progress" className="hover:text-indigo-600 transition-colors">Progress</Link>
        </div>
      </footer>
    </div>
  )
}
