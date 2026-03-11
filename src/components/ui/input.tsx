import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, Check } from "lucide-react"

/**
 * Input Component
 * 
 * Accessible text input following WCAG 2.1 AA guidelines.
 * 
 * Features:
 * - Visible focus indicator (2px ring)
 * - Error and success states with icons
 * - Helper text and error messages
 * - Label with required indicator
 * - Large touch target (44px minimum height)
 * - Proper ARIA attributes
 */

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  success?: string
  variant?: "default" | "error" | "success"
  containerClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      success,
      variant = "default",
      type = "text",
      id,
      required,
      disabled,
      containerClassName,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id || `input-${generatedId}`
    const helperTextId = `${inputId}-helper`
    const errorTextId = `${inputId}-error`
    
    // Determine variant based on error/success props
    const finalVariant = error ? "error" : success ? "success" : variant

    return (
      <div className={cn("w-full", containerClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "block text-sm font-semibold mb-2",
              "text-[var(--color-text-primary)]",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {label}
            {required && (
              <span className="text-[var(--color-error)] ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {/* Input container with icon */}
        <div className="relative">
          <input
            type={type}
            id={inputId}
            ref={ref}
            disabled={disabled}
            required={required}
            aria-describedby={
              error
                ? errorTextId
                : helperText
                ? helperTextId
                : undefined
            }
            aria-invalid={finalVariant === "error" ? true : undefined}
            className={cn(
              // Base styles
              "flex w-full rounded-lg px-4 py-3",
              "text-base text-[var(--color-text-primary)]",
              "bg-[var(--color-background)]",
              "border-2 transition-all duration-200",
              "placeholder:text-[var(--color-text-tertiary)]",
              
              // Focus state - WCAG AA compliant
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-offset-2",
              
              // Default variant
              finalVariant === "default" && [
                "border-[var(--color-gray-400)]",
                "hover:border-[var(--color-primary)]",
                "focus-visible:border-[var(--color-primary)]",
                "focus-visible:ring-[var(--color-primary)]",
              ],
              
              // Error variant
              finalVariant === "error" && [
                "border-[var(--color-error)]",
                "focus-visible:border-[var(--color-error)]",
                "focus-visible:ring-[var(--color-error)]",
                "pr-12", // Space for icon
              ],
              
              // Success variant
              finalVariant === "success" && [
                "border-[var(--color-success)]",
                "focus-visible:border-[var(--color-success)]",
                "focus-visible:ring-[var(--color-success)]",
                "pr-12", // Space for icon
              ],
              
              // Disabled state
              disabled && [
                "cursor-not-allowed opacity-50",
                "bg-[var(--color-gray-100)]",
                "border-[var(--color-gray-300)]",
              ],
              
              className
            )}
            {...props}
          />

          {/* Error icon */}
          {finalVariant === "error" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <AlertCircle
                className="w-5 h-5 text-[var(--color-error)]"
                aria-hidden="true"
              />
            </div>
          )}

          {/* Success icon */}
          {finalVariant === "success" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Check
                className="w-5 h-5 text-[var(--color-success)]"
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* Helper text */}
        {helperText && !error && !success && (
          <p
            id={helperTextId}
            className={cn(
              "text-sm text-[var(--color-text-secondary)] mt-1.5",
              disabled && "opacity-50"
            )}
          >
            {helperText}
          </p>
        )}

        {/* Error message */}
        {error && (
          <p
            id={errorTextId}
            className="text-sm text-[var(--color-error)] mt-1.5 flex items-center gap-1.5"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        {/* Success message */}
        {success && (
          <p
            className="text-sm text-[var(--color-success)] mt-1.5 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {success}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
