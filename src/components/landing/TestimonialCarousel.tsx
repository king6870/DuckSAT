'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TESTIMONIALS, type Testimonial } from '@/constants/testimonials'

interface TestimonialCarouselProps {
  testimonials?: Testimonial[]
  variant?: 'compact' | 'full'
  className?: string
}

function TestimonialCard({ t }: { t: Testimonial }) {
  const improvement = t.scoreAfter - t.scoreBefore
  return (
    <div className="testimonial-card w-[320px] sm:w-[360px] flex-shrink-0 bg-white rounded-2xl p-6 shadow-lg border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">{t.name}</span>
          {t.verified && <ShieldCheck className="w-4 h-4 text-blue-500" />}
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">{t.role}</span>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-gray-500">{t.scoreBefore}</span>
        <span className="text-gray-400">→</span>
        <span className="font-bold text-gray-900">{t.scoreAfter}</span>
        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">+{improvement}</span>
      </div>
      <p className="text-gray-600 italic text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
    </div>
  )
}

export default function TestimonialCarousel({ testimonials, variant = 'compact', className }: TestimonialCarouselProps) {
  const items = testimonials ?? TESTIMONIALS
  const trackRef = useRef<HTMLDivElement>(null)
  const [autoPlay, setAutoPlay] = useState(true)

  useEffect(() => {
    if (variant !== 'compact' || !autoPlay) return
    const track = trackRef.current
    if (!track) return

    const interval = setInterval(() => {
      const maxScroll = track.scrollWidth - track.clientWidth
      if (track.scrollLeft >= maxScroll - 10) {
        track.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        track.scrollBy({ left: 370, behavior: 'smooth' })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [variant, autoPlay])

  const scroll = (dir: 'left' | 'right') => {
    trackRef.current?.scrollBy({ left: dir === 'left' ? -370 : 370, behavior: 'smooth' })
  }

  if (variant === 'full') {
    return (
      <section className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16', className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.slice(0, 3).map((t) => (
            <div key={t.name} className="bg-white rounded-2xl p-6 shadow-lg border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{t.name}</span>
                  {t.verified && <ShieldCheck className="w-4 h-4 text-blue-500" />}
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">{t.role}</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-500">{t.scoreBefore}</span>
                <span className="text-gray-400">→</span>
                <span className="font-bold text-gray-900">{t.scoreAfter}</span>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  +{t.scoreAfter - t.scoreBefore}
                </span>
              </div>
              <p className="text-gray-600 italic text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8', className)}>
      <div className="relative">
        <div
          ref={trackRef}
          className="testimonial-track flex gap-6 overflow-x-auto pb-4 custom-scrollbar"
          onMouseEnter={() => setAutoPlay(false)}
          onMouseLeave={() => setAutoPlay(true)}
        >
          {items.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </div>
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 bg-white shadow-lg rounded-full p-2 border hover:bg-gray-50 transition hidden sm:block"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 bg-white shadow-lg rounded-full p-2 border hover:bg-gray-50 transition hidden sm:block"
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </section>
  )
}
