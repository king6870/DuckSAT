'use client';

import React, { useState, useRef } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StarRatingProps {
  /** Current rating value (0-5) */
  value: number;
  /** Callback when rating changes */
  onChange?: (rating: number) => void;
  /** Size of the stars in pixels */
  size?: number;
  /** Whether the rating is read-only */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Label for the rating group */
  ariaLabel?: string;
}

/**
 * Accessible star rating component with keyboard and mouse support
 * Implements WCAG 2.1 AA guidelines with proper ARIA attributes
 */
export default function StarRating({
  value,
  onChange,
  size = 32,
  readOnly = false,
  className,
  ariaLabel = 'Rating',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [focusedStar, setFocusedStar] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly) return;

    const currentRating = value || focusedStar || 1;
    
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        const nextRating = Math.min(5, currentRating + 1);
        setFocusedStar(nextRating);
        if (onChange) {
          onChange(nextRating);
        }
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        const prevRating = Math.max(1, currentRating - 1);
        setFocusedStar(prevRating);
        if (onChange) {
          onChange(prevRating);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedStar && onChange) {
          onChange(focusedStar);
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedStar(1);
        if (onChange) {
          onChange(1);
        }
        break;
      case 'End':
        e.preventDefault();
        setFocusedStar(5);
        if (onChange) {
          onChange(5);
        }
        break;
    }
  };

  const handleClick = (rating: number) => {
    if (readOnly || !onChange) return;
    onChange(rating);
  };

  const displayRating = hoverRating || value;

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('inline-flex gap-1', className)}
      onKeyDown={handleKeyDown}
      onMouseLeave={() => setHoverRating(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = star <= displayRating;
        const isFocused = star === focusedStar;
        
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            tabIndex={star === (value || 1) ? 0 : -1}
            disabled={readOnly}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readOnly && setHoverRating(star)}
            onFocus={() => setFocusedStar(star)}
            onBlur={() => setFocusedStar(null)}
            className={cn(
              'transition-all duration-150 ease-in-out rounded',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              !readOnly && 'cursor-pointer hover:scale-110',
              readOnly && 'cursor-default',
              isFocused && 'scale-110'
            )}
            style={{ width: size, height: size }}
          >
            <Star
              className={cn(
                'w-full h-full transition-colors duration-150',
                isActive ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
                !readOnly && 'hover:text-yellow-300'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
