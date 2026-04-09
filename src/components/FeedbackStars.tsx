'use client';

import { useState } from 'react';

interface FeedbackStarsProps {
  value: number; // 0 = unset, 1-5 = selected
  onChange: (rating: number) => void;
  disabled?: boolean;
}

export default function FeedbackStars({ value, onChange, disabled = false }: FeedbackStarsProps) {
  const [hovered, setHovered] = useState(0);

  function handleClick(star: number) {
    if (disabled) return;
    // clicking the already-selected star deselects it
    onChange(value === star ? 0 : star);
  }

  const effective = hovered > 0 ? hovered : value;

  return (
    <div
      className="flex items-center gap-2 justify-center"
      role="group"
      aria-label="Star rating"
      onMouseLeave={() => !disabled && setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= effective;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            aria-label={`Rate ${star} out of 5 stars`}
            aria-pressed={value === star}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !disabled && setHovered(star)}
            className={[
              'w-8 h-8 transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 rounded',
              disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110',
              filled ? 'text-yellow-400' : 'text-gray-300',
            ].join(' ')}
          >
            {/* Inline SVG star so we have full fill/outline control with no deps */}
            <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
              {filled ? (
                <path
                  fill="currentColor"
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                />
              ) : (
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                />
              )}
            </svg>
          </button>
        );
      })}
    </div>
  );
}
