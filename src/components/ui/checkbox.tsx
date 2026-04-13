import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Checkbox Component
 * 
 * Accessible checkbox following WCAG 2.1 AA guidelines.
 * Features:
 * - Visible focus indicator (2px ring)
 * - Keyboard navigation (Space, Tab)
 * - Screen reader support (aria-label, role)
 * - Large touch target (44px minimum)
 * - Clear checked/unchecked/indeterminate states
 */

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
  error?: string
  indeterminate?: boolean
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, indeterminate, id, checked, ...props }, ref) => {
    const checkboxRef = React.useRef<HTMLInputElement | null>(null)
    const generatedId = React.useId()
    const checkboxId = id || `checkbox-${generatedId}`

    // Handle indeterminate state
    React.useEffect(() => {
      const checkbox = checkboxRef.current || (ref as React.RefObject<HTMLInputElement | null>)?.current
      if (checkbox) {
        (checkbox as HTMLInputElement).indeterminate = indeterminate || false
      }
    }, [indeterminate, ref])

    // Combine refs
    const combinedRef = React.useCallback(
      (node: HTMLInputElement) => {
        checkboxRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = node
        }
      },
      [ref]
    )

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center justify-center min-h-[44px]">
          <input
            type="checkbox"
            ref={combinedRef}
            id={checkboxId}
            checked={checked}
            className={cn(
              // Hide default checkbox
              "peer sr-only",
              className
            )}
            {...props}
          />
          
          {/* Custom checkbox visual */}
          <label
            htmlFor={checkboxId}
            className={cn(
              // Base styles
              "flex items-center justify-center",
              "w-5 h-5 cursor-pointer rounded-md",
              "border-2 border-[var(--color-gray-400)]",
              "bg-white transition-all duration-200",
              
              // Hover state
              "hover:border-[var(--color-primary)]",
              
              // Focus state - WCAG AA compliant
              "peer-focus-visible:outline-none peer-focus-visible:ring-2",
              "peer-focus-visible:ring-[var(--color-primary)]",
              "peer-focus-visible:ring-offset-2",
              
              // Checked state
              "peer-checked:border-[var(--color-primary)]",
              "peer-checked:bg-[var(--color-primary)]",
              
              // Indeterminate state
              "peer-indeterminate:border-[var(--color-primary)]",
              "peer-indeterminate:bg-[var(--color-primary)]",
              
              // Disabled state
              "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
              "peer-disabled:border-[var(--color-gray-300)]",
              
              // Error state
              error && "border-[var(--color-error)] peer-checked:border-[var(--color-error)] peer-checked:bg-[var(--color-error)]"
            )}
          >
            {/* Check icon (visible when checked) */}
            <Check
              className={cn(
                "w-4 h-4 text-white opacity-0 transition-opacity duration-200",
                "peer-checked:opacity-100"
              )}
              aria-hidden="true"
            />
            
            {/* Indeterminate line (visible when indeterminate) */}
            {indeterminate && (
              <div
                className="absolute w-2.5 h-0.5 bg-white rounded"
                aria-hidden="true"
              />
            )}
          </label>
        </div>
        
        {/* Label and description */}
        {(label || description) && (
          <div className="flex-1 pt-1">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  "block text-base font-medium cursor-pointer",
                  "text-[var(--color-text-primary)]",
                  error ? "text-[var(--color-error)]" : "",
                  props.disabled && "cursor-not-allowed opacity-50"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p
                className={cn(
                  "text-sm text-[var(--color-text-secondary)] mt-1",
                  props.disabled && "opacity-50"
                )}
              >
                {description}
              </p>
            )}
            {error && (
              <p className="text-sm text-[var(--color-error)] mt-1" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

/**
 * CheckboxGroup Component
 * 
 * Groups multiple checkboxes together.
 */

export interface CheckboxGroupProps {
  children: React.ReactNode
  label?: string
  description?: string
  error?: string
  className?: string
  orientation?: 'vertical' | 'horizontal'
  required?: boolean
  disabled?: boolean
}

export function CheckboxGroup({
  children,
  label,
  description,
  error,
  className,
  orientation = 'vertical',
  required,
  disabled,
}: CheckboxGroupProps) {
  const groupId = React.useId()

  return (
    <fieldset
      className={cn("space-y-3", className)}
      aria-describedby={description ? `${groupId}-description` : undefined}
      aria-invalid={error ? true : undefined}
      disabled={disabled}
    >
      {label && (
        <legend className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
          {label}
          {required && <span className="text-[var(--color-error)] ml-1" aria-label="required">*</span>}
        </legend>
      )}
      
      {description && (
        <p
          id={`${groupId}-description`}
          className="text-sm text-[var(--color-text-secondary)] mb-3"
        >
          {description}
        </p>
      )}
      
      <div
        role="group"
        className={cn(
          "space-y-3",
          orientation === 'horizontal' && "flex flex-wrap gap-6 space-y-0"
        )}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === Checkbox) {
            return React.cloneElement(child as React.ReactElement<CheckboxProps>, {
              disabled: disabled || child.props.disabled,
              error: error || child.props.error,
            })
          }
          return child
        })}
      </div>
      
      {error && (
        <p className="text-sm text-[var(--color-error)] mt-2" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </fieldset>
  )
}

export { Checkbox }
