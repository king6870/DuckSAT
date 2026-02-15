import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

/**
 * Loading Component
 * 
 * Multiple variants for different loading states:
 * - spinner: Rotating circle (for actions/buttons)
 * - dots: Three bouncing dots (for page loads)
 * - pulse: Pulsing effect (subtle background loading)
 * - skeleton: Skeleton screens (for content placeholders)
 */

const loadingVariants = cva("", {
  variants: {
    variant: {
      spinner: "animate-spin",
      dots: "",
      pulse: "animate-pulse",
      skeleton: "animate-pulse bg-[var(--color-gray-200)] rounded",
    },
    size: {
      sm: "",
      md: "",
      lg: "",
    },
  },
  defaultVariants: {
    variant: "spinner",
    size: "md",
  },
})

export interface LoadingProps extends VariantProps<typeof loadingVariants> {
  className?: string
}

/**
 * Spinner variant - rotating circle
 */
export function LoadingSpinner({ size = "md", className }: LoadingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  }

  return (
    <Loader2
      className={cn(
        "animate-spin text-[var(--color-primary)]",
        sizeClasses[size!],
        className
      )}
      aria-label="Loading"
    />
  )
}

/**
 * Dots variant - three bouncing dots
 */
export function LoadingDots({ size = "md", className }: LoadingProps) {
  const sizeClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3",
  }

  return (
    <div className={cn("flex items-center justify-center gap-1", className)} aria-label="Loading">
      <div
        className={cn(
          "rounded-full bg-[var(--color-primary)] animate-bounce",
          sizeClasses[size!]
        )}
        style={{ animationDelay: "0ms" }}
      />
      <div
        className={cn(
          "rounded-full bg-[var(--color-primary)] animate-bounce",
          sizeClasses[size!]
        )}
        style={{ animationDelay: "150ms" }}
      />
      <div
        className={cn(
          "rounded-full bg-[var(--color-primary)] animate-bounce",
          sizeClasses[size!]
        )}
        style={{ animationDelay: "300ms" }}
      />
    </div>
  )
}

/**
 * Pulse variant - pulsing circle
 */
export function LoadingPulse({ size = "md", className }: LoadingProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  return (
    <div className={cn("flex items-center justify-center", className)} aria-label="Loading">
      <div
        className={cn(
          "rounded-full bg-[var(--color-primary)] opacity-75 animate-pulse",
          sizeClasses[size!]
        )}
      />
    </div>
  )
}

/**
 * Skeleton variant - content placeholder
 */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  circle?: boolean
}

export function Skeleton({
  className,
  width,
  height,
  circle = false,
  ...props
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  }

  return (
    <div
      className={cn(
        "animate-pulse bg-[var(--color-gray-200)]",
        circle ? "rounded-full" : "rounded-lg",
        className
      )}
      style={style}
      aria-label="Loading content"
      {...props}
    />
  )
}

/**
 * SkeletonText - multiple lines of skeleton text
 */
export interface SkeletonTextProps {
  lines?: number
  className?: string
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 ? "80%" : "100%"}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonCard - skeleton for card layouts
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] p-6 space-y-4",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <Skeleton circle width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton height={20} width="60%" />
          <Skeleton height={16} width="40%" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-2">
        <Skeleton height={36} width={100} />
        <Skeleton height={36} width={80} />
      </div>
    </div>
  )
}

/**
 * Main Loading component - unified API
 */
export function Loading({ variant = "spinner", size = "md", className }: LoadingProps) {
  switch (variant) {
    case "spinner":
      return <LoadingSpinner size={size} className={className} />
    case "dots":
      return <LoadingDots size={size} className={className} />
    case "pulse":
      return <LoadingPulse size={size} className={className} />
    case "skeleton":
      return <Skeleton className={className} />
    default:
      return <LoadingSpinner size={size} className={className} />
  }
}

// Export all variants
export { LoadingSpinner as Spinner, LoadingDots as Dots, LoadingPulse as Pulse }
