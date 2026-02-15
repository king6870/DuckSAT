"use client"

import * as React from "react"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/hooks/useTheme"
import { cn } from "@/lib/utils"

/**
 * ThemeToggle Component
 * 
 * Interactive button to toggle between light and dark themes.
 * 
 * Features:
 * - Sun/Moon icon transition
 * - Accessible button with proper ARIA label
 * - Smooth animations
 * - Focus indicators (WCAG AA)
 */

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative w-10 h-10 rounded-lg",
        "bg-gray-200 hover:bg-gray-300",
        "dark:bg-gray-700 dark:hover:bg-gray-600",
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
        "flex items-center justify-center",
        className
      )}
      aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Sun icon (visible in dark mode) */}
      <Sun
        className={cn(
          "absolute w-5 h-5 text-yellow-500",
          "transition-all duration-300",
          resolvedTheme === 'dark'
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-0 opacity-0"
        )}
      />

      {/* Moon icon (visible in light mode) */}
      <Moon
        className={cn(
          "absolute w-5 h-5 text-gray-700",
          "transition-all duration-300",
          resolvedTheme === 'light'
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        )}
      />
    </button>
  )
}
