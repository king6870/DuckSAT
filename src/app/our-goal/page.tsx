"use client"

import Link from "next/link"
import { Target, Globe, Rocket, Trophy, ArrowRight } from "lucide-react"
import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function OurGoalPage() {
  const { data: session } = useSession()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-indigo-200 mb-6">
          <Target className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-700">Our Goal</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
          Make SAT Prep{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Free & Accessible
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          We believe every student deserves a fair shot at college admissions — regardless of 
          their family&apos;s income. That starts with free, high-quality test prep.
        </p>
      </section>

      {/* Mission Statement */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-indigo-100 p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Mission</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed text-lg">
            <p>
              The SAT prep industry is a $1 billion market. Companies charge $500+ for courses 
              and $30–50/month for apps. That means students from wealthier families get better 
              prep, better scores, and better college options. It&apos;s not fair.
            </p>
            <p>
              DuckSAT exists to level that playing field. Our goal is simple: give every student 
              access to the same quality of practice material that expensive prep courses offer — 
              completely free.
            </p>
          </div>
        </div>
      </section>

      {/* Goals Grid */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">What We&apos;re Working Toward</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-indigo-500">
            <div className="flex items-center gap-3 mb-3">
              <Globe className="w-6 h-6 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-900">10,000+ Questions</h3>
            </div>
            <p className="text-gray-600 text-sm">
              We&apos;re building the largest free SAT question bank on the internet. Currently at 5,400+ 
              and growing every week. Our target is 10,000 by the end of 2026.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-cyan-500">
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="w-6 h-6 text-cyan-600" />
              <h3 className="text-lg font-bold text-gray-900">Score Improvement Tracking</h3>
            </div>
            <p className="text-gray-600 text-sm">
              We want every student to see measurable progress. Our analytics system tracks your 
              performance over time and identifies your weak spots so you can focus your practice.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-green-500">
            <div className="flex items-center gap-3 mb-3">
              <Rocket className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">Full-Length Practice Tests</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Take complete SAT practice tests that mimic the real thing — timed modules, 
              adaptive difficulty, and detailed score reports. Practice under real conditions.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">100% Free, Forever</h3>
            </div>
            <p className="text-gray-600 text-sm">
              No premium plans. No freemium upsells. No ads. DuckSAT will always be free. 
              We&apos;d rather help students than make money.
            </p>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-indigo-100 p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Roadmap</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm">✓</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Q4 2025 — Launch</h4>
                <p className="text-gray-600 text-sm">Core platform, 5,000+ questions, practice tests, topic drills</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">→</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Q1 2026 — Diagrams & Visuals</h4>
                <p className="text-gray-600 text-sm">Auto-generated diagrams for 25%+ of questions, improved math rendering</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">○</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Q2 2026 — Study Plans</h4>
                <p className="text-gray-600 text-sm">Personalized study schedules based on test date and weak areas</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold">○</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Q3 2026 — 10,000 Questions</h4>
                <p className="text-gray-600 text-sm">Double our question bank with community contributions and expanded AI generation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-20">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 sm:p-12 shadow-2xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to Start Practicing?</h2>
          <p className="text-indigo-200 mb-8 max-w-lg mx-auto">
            Join thousands of students already using DuckSAT to prepare for the SAT. It&apos;s free — always.
          </p>
          {session ? (
            <button
              onClick={() => router.push('/practice')}
              className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Start Practicing
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </section>

      {/* Footer Nav */}
      <footer className="border-t border-gray-200 bg-white/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
          <Link href="/about" className="hover:text-indigo-600 transition-colors">About</Link>
          <Link href="/how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</Link>
          <Link href="/our-goal" className="text-indigo-600 font-semibold">Our Goal</Link>
        </div>
      </footer>
    </div>
  )
}
