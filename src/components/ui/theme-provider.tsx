"use client";

import { useEffect } from 'react';

/**
 * ThemeProvider Component
 * 
 * Initializes theme on client-side as early as possible to prevent flash.
 * Uses a script to apply theme before React hydration.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Get saved theme from localStorage or detect system preference
    const getInitialTheme = () => {
      const savedTheme = localStorage.getItem('ducksat-theme');
      
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
      
      // If theme is 'system' or not set, use system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      
      return 'light';
    };
    
    const theme = getInitialTheme();
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  return <>{children}</>;
}
