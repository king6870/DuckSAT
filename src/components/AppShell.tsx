'use client'

import AuthSessionProvider from '@/components/SessionProvider'
import AnalyticsProvider from '@/components/AnalyticsProvider'
import UserMenu from '@/components/UserMenu'
import MobileNav from '@/components/MobileNav'
import FeedbackWidget from '@/components/FeedbackWidget'
import KlaviyoEmbed from '@/components/KlaviyoEmbed'
import { ReferralPopup } from '@/components/ReferralPopup'
import SiteFooter from '@/components/SiteFooter'
import Link from 'next/link'
import Image from 'next/image'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthSessionProvider>
      <AnalyticsProvider>
        <header role="banner" className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-background)]/95 backdrop-blur-sm border-b border-[var(--color-border)] shadow-sm">
          <nav role="navigation" aria-label="Main navigation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 rounded-lg"
                aria-label="DuckSAT Home"
              >
                <Image src="/duck-logo.svg" alt="" width={40} height={40} className="w-10 h-10" aria-hidden="true" />
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  DuckSAT
                </span>
              </Link>
              <div className="hidden sm:flex items-center gap-4 text-sm font-medium">
                <Link href="/about" className="text-[var(--color-text-secondary)] hover:text-indigo-600 transition-colors">About</Link>
                <Link href="/practice-tests" className="text-[var(--color-text-secondary)] hover:text-indigo-600 transition-colors">Tests</Link>
                <Link href="/practice" className="text-[var(--color-text-secondary)] hover:text-indigo-600 transition-colors">Drills</Link>
                <Link href="/how-it-works" className="text-[var(--color-text-secondary)] hover:text-indigo-600 transition-colors">How It Works</Link>
                <Link href="/our-goal" className="text-[var(--color-text-secondary)] hover:text-indigo-600 transition-colors">Our Goal</Link>
                <Link href="/pricing" className="text-[var(--color-text-secondary)] hover:text-indigo-600 transition-colors">Pricing</Link>
                <Link href="/dashboard" className="text-[var(--color-text-secondary)] hover:text-indigo-600 transition-colors">Dashboard</Link>
                <Link href="/progress" className="text-[var(--color-text-secondary)] hover:text-indigo-600 transition-colors">Progress</Link>
                <Link href="/friends" className="text-[var(--color-text-secondary)] hover:text-indigo-600 transition-colors">Friends</Link>
                <Link href="/referrals" className="text-[var(--color-text-secondary)] hover:text-indigo-600 transition-colors">Referrals</Link>
              </div>
            </div>
            <UserMenu />
            <MobileNav />
          </nav>
        </header>

        <main role="main" className="pt-16">
          {children}
        </main>

        <SiteFooter />
        <FeedbackWidget />
        <ReferralPopup />
        <KlaviyoEmbed />
      </AnalyticsProvider>
    </AuthSessionProvider>
  )
}