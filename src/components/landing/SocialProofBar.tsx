'use client'

import { Users, TrendingUp, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SocialProofBarProps {
  variant?: 'light' | 'dark'
  className?: string
}

const badges = [
  { icon: Users, text: '500+ Students' },
  { icon: TrendingUp, text: 'Avg +120 Score Improvement' },
  { icon: BookOpen, text: '5,400+ Questions' },
]

export default function SocialProofBar({ variant = 'light', className }: SocialProofBarProps) {
  return (
    <div className={cn('flex flex-wrap justify-center items-center gap-6 sm:gap-8', className)}>
      {badges.map((badge) => (
        <div
          key={badge.text}
          className={cn(
            'flex items-center gap-2',
            variant === 'light' ? 'text-gray-600' : 'text-white/80'
          )}
        >
          <badge.icon className="w-5 h-5" />
          <span className="text-sm font-semibold">{badge.text}</span>
        </div>
      ))}
    </div>
  )
}
