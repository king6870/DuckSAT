import React from 'react'

interface EnhancedCardProps {
  children: React.ReactNode
  className?: string
  interactive?: boolean
  selected?: boolean
  onClick?: () => void
  padding?: 'sm' | 'md' | 'lg'
  animation?: 'slide-in-up' | 'slide-in-right' | 'fade-in' | 'scale-in'
  style?: React.CSSProperties
}

export default function EnhancedCard({
  children,
  className = '',
  interactive = false,
  selected = false,
  onClick,
  padding = 'md',
  animation,
  style
}: EnhancedCardProps) {
  const baseClasses = 'enhanced-card'
  const interactiveClass = interactive ? 'enhanced-card--interactive' : ''
  const selectedClass = selected ? 'enhanced-card--selected' : ''
  const animationClass = animation || ''
  
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
  
  const combinedClasses = [
    baseClasses,
    interactiveClass,
    selectedClass,
    animationClass,
    paddingClasses[padding],
    className
  ].filter(Boolean).join(' ')

  const CardComponent = onClick ? 'button' : 'div'

  return (
    <CardComponent
      className={combinedClasses}
      onClick={onClick}
      style={style}
    >
      {children}
    </CardComponent>
  )
}