'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { SALE } from '@/constants/pricing'

interface CountdownTimerProps {
  endDate?: Date
  label?: string
  className?: string
}

export default function CountdownTimer({ endDate, label, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const target = endDate ?? SALE.getEndDate()

    function update() {
      const now = new Date().getTime()
      const diff = target.getTime() - now

      if (diff <= 0) {
        setExpired(true)
        return
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [endDate])

  if (expired) {
    return <span className={cn('text-sm text-gray-500', className)}>Sale ended</span>
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className={cn('flex items-center gap-1 text-gray-900', className)}>
      {label && <span className="text-sm font-medium mr-2">{label}</span>}
      <div className="flex items-center gap-1">
        {timeLeft ? (
          <>
            <span className="countdown-digit rounded-lg px-2 py-1 text-sm font-bold font-mono text-center" style={{ backgroundColor: '#111827', color: '#fff' }}>
              {pad(timeLeft.days)}
            </span>
            <span className="font-bold opacity-60">:</span>
            <span className="countdown-digit rounded-lg px-2 py-1 text-sm font-bold font-mono text-center" style={{ backgroundColor: '#111827', color: '#fff' }}>
              {pad(timeLeft.hours)}
            </span>
            <span className="font-bold opacity-60">:</span>
            <span className="countdown-digit rounded-lg px-2 py-1 text-sm font-bold font-mono text-center" style={{ backgroundColor: '#111827', color: '#fff' }}>
              {pad(timeLeft.minutes)}
            </span>
            <span className="font-bold opacity-60">:</span>
            <span className="countdown-digit rounded-lg px-2 py-1 text-sm font-bold font-mono text-center" style={{ backgroundColor: '#111827', color: '#fff' }}>
              {pad(timeLeft.seconds)}
            </span>
          </>
        ) : (
          <>
            <span className="countdown-digit rounded-lg px-2 py-1 text-sm font-bold font-mono text-center" style={{ backgroundColor: '#111827', color: '#fff' }}>--</span>
            <span className="font-bold opacity-60">:</span>
            <span className="countdown-digit rounded-lg px-2 py-1 text-sm font-bold font-mono text-center" style={{ backgroundColor: '#111827', color: '#fff' }}>--</span>
            <span className="font-bold opacity-60">:</span>
            <span className="countdown-digit rounded-lg px-2 py-1 text-sm font-bold font-mono text-center" style={{ backgroundColor: '#111827', color: '#fff' }}>--</span>
            <span className="font-bold opacity-60">:</span>
            <span className="countdown-digit rounded-lg px-2 py-1 text-sm font-bold font-mono text-center" style={{ backgroundColor: '#111827', color: '#fff' }}>--</span>
          </>
        )}
      </div>
    </div>
  )
}
