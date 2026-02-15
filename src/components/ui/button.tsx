import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Button Component
 * 
 * Standardized button using design tokens from tokens.css.
 * Variants: primary, secondary, outline, ghost, danger
 * Sizes: sm, md (default), lg
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:translate-y-px shadow-sm hover:shadow-md focus-visible:ring-[var(--color-primary)]",
        secondary: "bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary-hover)] active:translate-y-px shadow-sm hover:shadow-md focus-visible:ring-[var(--color-secondary)]",
        outline: "border-2 border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text-primary)] hover:bg-[var(--color-gray-50)] hover:border-[var(--color-primary)] focus-visible:ring-[var(--color-primary)]",
        ghost: "bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-gray-100)] focus-visible:ring-[var(--color-gray-400)]",
        danger: "bg-[var(--color-error)] text-white hover:bg-[var(--color-error-hover)] active:translate-y-px shadow-sm hover:shadow-md focus-visible:ring-[var(--color-error)]",
        // Legacy aliases for compatibility
        default: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:translate-y-px shadow-sm hover:shadow-md focus-visible:ring-[var(--color-primary)]",
        destructive: "bg-[var(--color-error)] text-white hover:bg-[var(--color-error-hover)] active:translate-y-px shadow-sm hover:shadow-md focus-visible:ring-[var(--color-error)]",
        link: "text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:ring-[var(--color-primary)]",
      },
      size: {
        sm: "h-9 px-4 py-2 text-sm rounded-lg",
        md: "h-10 px-6 py-3 text-base rounded-lg",
        lg: "h-12 px-8 py-4 text-lg rounded-xl",
        icon: "h-10 w-10 rounded-lg",
        // Legacy alias
        default: "h-10 px-6 py-3 text-base rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
