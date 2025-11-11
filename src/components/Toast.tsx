'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  /** Message to display */
  message: string;
  /** Type of toast */
  type?: ToastType;
  /** Whether the toast is visible */
  visible?: boolean;
  /** Callback when toast should be dismissed */
  onDismiss?: () => void;
  /** Auto-dismiss duration in milliseconds (0 to disable) */
  duration?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Accessible toast notification component
 * Auto-dismisses after specified duration
 */
export default function Toast({
  message,
  type = 'info',
  visible = true,
  onDismiss,
  duration = 3000,
  className,
}: ToastProps) {
  useEffect(() => {
    if (visible && duration > 0 && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  const icons = {
    success: <CheckCircle className="h-5 w-5 flex-shrink-0" />,
    error: <XCircle className="h-5 w-5 flex-shrink-0" />,
    info: <AlertCircle className="h-5 w-5 flex-shrink-0" />,
  };

  const styles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border shadow-lg',
        'animate-in slide-in-from-top-5 duration-300',
        styles[type],
        className
      )}
    >
      {icons[type]}
      <p className="flex-1 text-sm font-medium">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'flex-shrink-0 rounded-md p-1 transition-colors',
            'hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2',
            type === 'success' && 'focus:ring-green-500',
            type === 'error' && 'focus:ring-red-500',
            type === 'info' && 'focus:ring-blue-500'
          )}
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
