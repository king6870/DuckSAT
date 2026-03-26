'use client'

import Link from 'next/link'
import SocialProofBar from './SocialProofBar'

export default function LandingFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <SocialProofBar variant="light" />
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/about" className="hover:text-indigo-600 transition-colors">About</Link>
            <Link href="/how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</Link>
            <Link href="/our-goal" className="hover:text-indigo-600 transition-colors">Our Goal</Link>
            <Link href="/pricing" className="hover:text-indigo-600 transition-colors">Pricing</Link>
            <Link href="/progress" className="hover:text-indigo-600 transition-colors">Progress</Link>
          </div>
          <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} DuckSAT. Affordable SAT prep for everyone.</p>
        </div>
      </div>
    </footer>
  )
}
