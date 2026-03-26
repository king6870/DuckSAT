'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ScrollRevealProps {
  children: React.ReactNode
  delay?: number
  className?: string
  direction?: 'up' | 'left' | 'right' | 'fade'
}

export default function ScrollReveal({ children, delay = 0, className, direction = 'up' }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay)
          observer.unobserve(el)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  const baseClass = direction === 'left'
    ? 'scroll-reveal-left'
    : direction === 'right'
      ? 'scroll-reveal-right'
      : 'scroll-reveal'

  return (
    <div ref={ref} className={cn(baseClass, visible && 'visible', className)}>
      {children}
    </div>
  )
}
