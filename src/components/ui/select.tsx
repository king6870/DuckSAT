import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Select Component
 * 
 * Accessible dropdown select following WCAG 2.1 AA guidelines.
 * Built on Radix UI Select primitive.
 * 
 * Features:
 * - Keyboard navigation (Arrow keys, Enter, Space, Home, End)
 * - Type-ahead search
 * - ARIA attributes (role="combobox", aria-expanded, aria-label)
 * - Visual focus indicators
 * - Label and helper text support
 * - Error state
 */

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    error?: boolean
  }
>(({ className, error, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-12 w-full items-center justify-between rounded-lg",
      "border-2 bg-[var(--color-background)] px-4 py-3 text-base",
      "text-[var(--color-text-primary)]",
      "placeholder:text-[var(--color-text-tertiary)]",
      "transition-all duration-200",
      
      // Focus state - WCAG AA compliant
      "focus-visible:outline-none focus-visible:ring-2",
      "focus-visible:ring-offset-2",
      
      // Default state
      !error && [
        "border-[var(--color-gray-400)]",
        "hover:border-[var(--color-primary)]",
        "focus-visible:border-[var(--color-primary)]",
        "focus-visible:ring-[var(--color-primary)]",
      ],
      
      // Error state
      error && [
        "border-[var(--color-error)]",
        "focus-visible:border-[var(--color-error)]",
        "focus-visible:ring-[var(--color-error)]",
      ],
      
      // Disabled state
      "disabled:cursor-not-allowed disabled:opacity-50",
      "disabled:bg-[var(--color-gray-100)]",
      
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden",
        "rounded-xl border-2 border-[var(--color-gray-300)]",
        "bg-[var(--color-background)] shadow-xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2",
        "data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2",
        "data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      "px-3 py-2 text-sm font-semibold",
      "text-[var(--color-text-secondary)]",
      className
    )}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center",
      "rounded-lg py-2.5 pl-10 pr-3",
      "text-base outline-none",
      "transition-colors duration-150",
      "focus:bg-[var(--color-primary-light)] focus:text-[var(--color-primary)]",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-[var(--color-primary)]" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-[var(--color-gray-300)]", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

/**
 * SelectField Component
 * 
 * Complete select field with label, helper text, and error handling.
 */

export interface SelectFieldProps {
  label?: string
  helperText?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  triggerClassName?: string
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}

const SelectField = React.forwardRef<HTMLButtonElement, SelectFieldProps>(
  (
    {
      label,
      helperText,
      error,
      required,
      children,
      className,
      triggerClassName,
      placeholder = "Select an option...",
      value,
      onValueChange,
      disabled,
    },
    ref
  ) => {
    const selectId = React.useId()
    const helperTextId = `${selectId}-helper`
    const errorTextId = `${selectId}-error`

    return (
      <div className={cn("w-full", className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
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

        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger
            ref={ref}
            id={selectId}
            error={!!error}
            className={triggerClassName}
            aria-describedby={
              error ? errorTextId : helperText ? helperTextId : undefined
            }
            aria-invalid={error ? true : undefined}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>{children}</SelectContent>
        </Select>

        {/* Helper text */}
        {helperText && !error && (
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
            className="text-sm text-[var(--color-error)] mt-1.5"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)
SelectField.displayName = "SelectField"

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectField,
}
