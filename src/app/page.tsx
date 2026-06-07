"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import HeroSection from "@/components/landing/HeroSection"
import TestimonialCarousel from "@/components/landing/TestimonialCarousel"
import HowItWorks from "@/components/landing/HowItWorks"
import HomepageQuestionDemo from "@/components/landing/HomepageQuestionDemo"
import FeatureGrid from "@/components/landing/FeatureGrid"
import WhyDuckSAT from "@/components/landing/WhyDuckSAT"
import ValueStack from "@/components/landing/ValueStack"
import UserSegmentation from "@/components/landing/UserSegmentation"
import UrgencyCTA from "@/components/landing/UrgencyCTA"
import LandingFooter from "@/components/landing/LandingFooter"
import { trackMetaClickthrough } from '@/lib/metaPixel'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
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
  const handleGetStarted = () => {
    const destination = isAuthenticated ? '/practice-tests' : '/auth/signin'

    trackMetaClickthrough({
      location: 'landing_home',
      destination,
      isAuthenticated,
    })

    router.push(destination)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <HeroSection onGetStarted={handleGetStarted} isAuthenticated={isAuthenticated} />
      <TestimonialCarousel variant="compact" />
      <HowItWorks />
      <HomepageQuestionDemo />
      <FeatureGrid />
      <WhyDuckSAT />
      <TestimonialCarousel variant="full" />
      <ValueStack />
      <UserSegmentation />
      <UrgencyCTA onGetStarted={handleGetStarted} isAuthenticated={isAuthenticated} />
      <LandingFooter />
    </div>
  )
}