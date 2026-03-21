"use client"

import Link from "next/link"
import Image from "next/image"
import { Users, Heart, Sparkles, BookOpen } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-indigo-200 mb-6">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-700">About DuckSAT</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
          Built by Students,{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            for Students
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          DuckSAT started as a side project by two high school students who were frustrated with 
          expensive SAT prep tools that didn&apos;t actually help. We decided to build something better — and affordable.
        </p>
      </section>

      {/* Story Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-indigo-100 p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Story</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              In the fall of 2025, we were just another pair of students stressing about the SAT. 
              We tried every app out there — some cost $50/month, others had outdated questions, and most 
              felt like they were designed by people who hadn&apos;t taken a standardized test in decades.
            </p>
            <p>
              So we asked ourselves: what if we built our own? What if we created a platform that 
              actually understood what students need — adaptive practice, instant feedback, and questions 
              that feel like the real Digital SAT?
            </p>
            <p>
              That&apos;s how DuckSAT was born. We started coding between homework assignments and late-night 
              study sessions. The name? Our school mascot is a duck — and it stuck.
            </p>
          </div>
        </div>
      </section>

      {/* Team Values */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">What We Believe In</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-transparent hover:border-indigo-200 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Affordable for Everyone</h3>
            <p className="text-gray-600 text-sm">
              SAT prep shouldn&apos;t be a luxury. DuckSAT is incredibly affordable — no hidden fees, 
              no overpriced tiers, no paywalls.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-transparent hover:border-cyan-200 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Student-First Design</h3>
            <p className="text-gray-600 text-sm">
              Every feature is built because a student needed it. We use DuckSAT ourselves, 
              so we know what works and what doesn&apos;t.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-transparent hover:border-green-200 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Quality Questions</h3>
            <p className="text-gray-600 text-sm">
              Our question bank is carefully curated and reviewed. Every question is aligned 
              with the official Digital SAT format and difficulty.
            </p>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-20">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 sm:p-12 shadow-2xl text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Meet the Team</h2>
          <p className="text-indigo-200 mb-8 max-w-lg mx-auto">
            Just two students with a laptop, some coffee, and a mission to make SAT prep accessible to all.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-md mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <Image
                src="/founder1.jpg"
                alt="Co-Founder & Developer"
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover mx-auto mb-3 ring-2 ring-white/30"
              />
              <h3 className="text-lg font-bold text-white">Founder 1</h3>
              <p className="text-indigo-200 text-sm">Co-Founder & Developer</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <Image
                src="/founder2.jpg"
                alt="Co-Founder & Content Lead"
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover mx-auto mb-3 ring-2 ring-white/30"
              />
              <h3 className="text-lg font-bold text-white">Founder 2</h3>
              <p className="text-indigo-200 text-sm">Co-Founder & Content Lead</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Nav */}
      <footer className="border-t border-gray-200 bg-white/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
          <Link href="/about" className="text-indigo-600 font-semibold">About</Link>
          <Link href="/how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</Link>
          <Link href="/our-goal" className="hover:text-indigo-600 transition-colors">Our Goal</Link>
          <Link href="/progress" className="hover:text-indigo-600 transition-colors">Progress</Link>
        </div>
      </footer>
    </div>
  )
}
