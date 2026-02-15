"use client"

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'ducksat-theme'

/**
 * useTheme Hook
 * 
 * Manages theme state with:
 * - localStorage persistence
 * - System preference detection (prefers-color-scheme)
 * - Automatic theme application via data-theme attribute
 * 
 * @returns {Object} theme state and setter
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Get system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }

  // Apply theme to document

  const applyTheme = (newTheme: Theme) => {
    if (typeof window === 'undefined') return

    const effectiveTheme = newTheme === 'system' ? getSystemTheme() : newTheme

    // Update data-theme attribute on html element
    document.documentElement.setAttribute('data-theme', effectiveTheme)
    
    // Update resolved theme state
    setResolvedTheme(effectiveTheme)
  }

  // Set theme and persist
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
    applyTheme(newTheme)
  }

  // Toggle between light and dark (skip system)
  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  // Initialize theme on mount
  useEffect(() => {
    // Get saved theme or default to system
    const savedTheme = (localStorage.getItem(STORAGE_KEY) as Theme) || 'system'
    setThemeState(savedTheme)
    applyTheme(savedTheme)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (savedTheme === 'system') {
        const newSystemTheme = e.matches ? 'dark' : 'light'
        setResolvedTheme(newSystemTheme)
        document.documentElement.setAttribute('data-theme', newSystemTheme)
      }
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  }
}
