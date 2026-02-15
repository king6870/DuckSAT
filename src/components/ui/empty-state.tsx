import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

/**
 * EmptyState Component
 * 
 * Display when there's no data, no results, or an error state.
 * 
 * Features:
 * - Consistent empty state UI across the app
 * - Optional icon, title, description, and CTA
 * - Multiple variants (info, warning, error)
 * - Accessible with proper ARIA attributes
 */

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "primary" | "secondary" | "outline"
  }
  variant?: "info" | "warning" | "error"
  className?: string
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon: Icon,
      title,
      description,
      action,
      variant = "info",
      className,
    },
    ref
  ) => {
    // Determine icon color based on variant
    const iconColorClass = {
      info: "text-[var(--color-primary)]",
      warning: "text-[var(--color-warning)]",
      error: "text-[var(--color-error)]",
    }[variant]

    // Determine background color based on variant
    const bgColorClass = {
      info: "bg-blue-50",
      warning: "bg-amber-50",
      error: "bg-red-50",
    }[variant]

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn(
          "flex flex-col items-center justify-center",
          "text-center px-6 py-12 rounded-2xl",
          bgColorClass,
          "border-2",
          variant === "info" && "border-blue-200",
          variant === "warning" && "border-amber-200",
          variant === "error" && "border-red-200",
          className
        )}
      >
        {/* Icon */}
        {Icon && (
          <div
            className={cn(
              "mb-6 rounded-full p-4",
              "bg-white shadow-md",
              iconColorClass
            )}
            aria-hidden="true"
          >
            <Icon className="w-12 h-12" strokeWidth={1.5} />
          </div>
        )}

        {/* Title */}
        <h3
          className={cn(
            "text-2xl font-bold mb-3",
            "text-[var(--color-text-primary)]"
          )}
        >
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p
            className={cn(
              "text-base text-[var(--color-text-secondary)]",
              "max-w-md mb-6"
            )}
          >
            {description}
          </p>
        )}

        {/* Action Button */}
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || "primary"}
            size="lg"
            className="mt-2"
            aria-label={action.label}
          >
            {action.label}
          </Button>
        )}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState }
