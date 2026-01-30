import React from 'react'

interface EnhancedProgressProps {
  value: number // 0-100
  max?: number
  className?: string
  showLabel?: boolean
  label?: string
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export default function EnhancedProgress({
  value,
  max = 100,
  className = '',
  showLabel = false,
  label,
  variant = 'primary',
  size = 'md',
  animated = true
}: EnhancedProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-500 to-purple-600',
    success: 'bg-gradient-to-r from-blue-400 to-cyan-400',
    warning: 'bg-gradient-to-r from-pink-500 to-yellow-400',
    danger: 'bg-gradient-to-r from-red-500 to-orange-500'
  }

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {label || 'Progress'}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className={`enhanced-progress ${sizeClasses[size]}`}>
        <div
          className={`enhanced-progress__fill ${variantClasses[variant]} ${animated ? 'transition-all duration-500 ease-out' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}