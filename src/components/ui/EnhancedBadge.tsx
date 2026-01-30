import React from 'react'

interface EnhancedBadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  pulse?: boolean
}

export default function EnhancedBadge({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  pulse = false
}: EnhancedBadgeProps) {
  const baseClasses = 'enhanced-badge'
  const variantClass = `enhanced-badge--${variant}`
  const pulseClass = pulse ? 'pulse' : ''
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  }
  
  const combinedClasses = [
    baseClasses,
    variantClass,
    sizeClasses[size],
    pulseClass,
    className
  ].filter(Boolean).join(' ')

  return (
    <span className={combinedClasses}>
      {children}
    </span>
  )
}