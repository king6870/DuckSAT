import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className={cn(
            "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer",
            className
          )}
          ref={ref}
          {...props}
        />
        {label && <span className="text-sm">{label}</span>}
      </label>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
