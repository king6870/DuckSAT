import React from 'react'

interface EnhancedButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  hasGlow?: boolean
  disabled?: boolean
  className?: string
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export default function EnhancedButton({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  hasGlow = false,
  disabled = false,
  className = '',
  children,
  onClick,
  type = 'button'
}: EnhancedButtonProps) {
  const baseClasses = 'enhanced-button'
  const variantClass = `enhanced-button--${variant}`
  const sizeClass = `enhanced-button--${size}`
  const glowClass = hasGlow ? 'enhanced-button--glow' : ''
  
  const combinedClasses = [
    baseClasses,
    variantClass,
    sizeClass,
    glowClass,
    className
  ].filter(Boolean).join(' ')

  return (
    <button
      type={type}
      className={combinedClasses}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <div className="enhanced-spinner" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
}