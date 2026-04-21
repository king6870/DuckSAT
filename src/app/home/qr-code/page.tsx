"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import HeroSection from "@/components/landing/HeroSection"
import TestimonialCarousel from "@/components/landing/TestimonialCarousel"
import HowItWorks from "@/components/landing/HowItWorks"
import FeatureGrid from "@/components/landing/FeatureGrid"
import WhyDuckSAT from "@/components/landing/WhyDuckSAT"
import ValueStack from "@/components/landing/ValueStack"
import GuaranteeSection from "@/components/landing/GuaranteeSection"
import UserSegmentation from "@/components/landing/UserSegmentation"
import UrgencyCTA from "@/components/landing/UrgencyCTA"
import LandingFooter from "@/components/landing/LandingFooter"

export default function QrCodeHome() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  // Mark this visitor as coming from a QR code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('qr_source', 'true')
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // If already logged in and arrived via QR, mark them now
      fetch('/api/users/mark-qr-source', { method: 'POST' }).catch(() => {})

      fetch('/api/onboarding')
        .then(res => {
          if (!res.ok) {
            setOnboardingChecked(true)
            return null
          }
          return res.json()
        })
        .then(data => {
          if (!data) return
          if (data.onboardingCompleted === false) {
            router.push('/onboarding')
          } else {
            setOnboardingChecked(true)
          }
        })
        .catch(() => setOnboardingChecked(true))
    }
  }, [status, session, router])

  if (status === 'loading' || (status === 'authenticated' && !onboardingChecked)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  const isAuthenticated = !!session
  const handleGetStarted = isAuthenticated
    ? () => router.push('/practice-tests')
    : () => router.push('/auth/signin')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <HeroSection onGetStarted={handleGetStarted} isAuthenticated={isAuthenticated} />
      <TestimonialCarousel variant="compact" />
      <HowItWorks />
      <FeatureGrid />
      <WhyDuckSAT />
      <TestimonialCarousel variant="full" />
      <ValueStack />
      <GuaranteeSection />
      <UserSegmentation />
      <UrgencyCTA onGetStarted={handleGetStarted} isAuthenticated={isAuthenticated} />
      <LandingFooter />
    </div>
  )
}
