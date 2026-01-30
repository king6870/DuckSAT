"use client"

import React from 'react'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

interface MathRendererProps {
  children: string
  block?: boolean
  className?: string
}

/**
 * MathRenderer component for displaying mathematical equations
 * Automatically detects and renders LaTeX math expressions
 */
export default function MathRenderer({ children, block = false, className = '' }: MathRendererProps) {
  // Convert common math notation to LaTeX
  const convertToLatex = (text: string): string => {
    return text
      // Fractions: 1/2 -> \frac{1}{2}
      .replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}')
      // Exponents: x^2 -> x^{2}, x^(2+3) -> x^{(2+3)}
      .replace(/\^(\d+)/g, '^{$1}')
      .replace(/\^(\([^)]+\))/g, '^{$1}')
      // Square roots: sqrt(x) -> \sqrt{x}
      .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
      // Subscripts: x_1 -> x_{1}
      .replace(/_(\d+)/g, '_{$1}')
      // Greek letters
      .replace(/\bpi\b/g, '\\pi')
      .replace(/\btheta\b/g, '\\theta')
      .replace(/\balpha\b/g, '\\alpha')
      .replace(/\bbeta\b/g, '\\beta')
      .replace(/\bgamma\b/g, '\\gamma')
      .replace(/\bdelta\b/g, '\\delta')
      // Infinity
      .replace(/infinity/g, '\\infty')
      // Plus/minus
      .replace(/\+\/-/g, '\\pm')
      // Degree symbol
      .replace(/degrees?/g, '^\\circ')
      // Inequalities
      .replace(/<=/g, '\\leq')
      .replace(/>=/g, '\\geq')
      .replace(/!=/g, '\\neq')
      // Functions
      .replace(/\bsin\b/g, '\\sin')
      .replace(/\bcos\b/g, '\\cos')
      .replace(/\btan\b/g, '\\tan')
      .replace(/\blog\b/g, '\\log')
      .replace(/\bln\b/g, '\\ln')
  }

  // Check if the text contains math expressions
  const containsMath = (text: string): boolean => {
    const mathPatterns = [
      /\^[\d\{\(]/,  // Exponents
      /_[\d\{]/,     // Subscripts
      /\\[a-zA-Z]+/, // LaTeX commands
      /\\\{|\\\}/,   // LaTeX braces
      /\bsqrt\(/,    // Square root
      /\d+\/\d+/,    // Fractions
      /[xy]\s*[=<>]/,// Equations
      /\([^)]*[xy][^)]*\)/, // Expressions with variables
    ]
    return mathPatterns.some(pattern => pattern.test(text))
  }

  // Split text into math and non-math parts
  const renderMixedContent = (text: string) => {
    // Look for inline math expressions in $...$ or between common math patterns
    const parts = []
    let currentIndex = 0
    
    // Find math expressions
    const mathRegex = /(\$[^$]+\$|[xy]\s*=\s*[^,\s.!?]+|f\([^)]+\)\s*=\s*[^,\s.!?]+|\d+\/\d+|[a-zA-Z]\^[\d\{]|\\[a-zA-Z]+\{[^}]*\})/g
    let match
    
    while ((match = mathRegex.exec(text)) !== null) {
      // Add text before math
      if (match.index > currentIndex) {
        parts.push(
          <span key={`text-${currentIndex}`}>
            {text.slice(currentIndex, match.index)}
          </span>
        )
      }
      
      // Add math expression
      let mathExpression = match[1]
      if (mathExpression.startsWith('$') && mathExpression.endsWith('$')) {
        mathExpression = mathExpression.slice(1, -1)
      }
      
      try {
        parts.push(
          <InlineMath key={`math-${match.index}`}>
            {convertToLatex(mathExpression)}
          </InlineMath>
        )
      } catch (error) {
        // If LaTeX parsing fails, show as regular text
        parts.push(
          <span key={`fallback-${match.index}`} className="font-mono bg-gray-100 px-1 rounded">
            {mathExpression}
          </span>
        )
      }
      
      currentIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(
        <span key={`text-${currentIndex}`}>
          {text.slice(currentIndex)}
        </span>
      )
    }
    
    return parts.length > 0 ? parts : [text]
  }

  // If it's a block math expression or contains only math
  if (block || (containsMath(children) && children.trim().match(/^[\s\$]*[xy]\s*=|^[\s\$]*f\([^)]+\)\s*=|^[\s\$]*\\[a-zA-Z]/))) {
    try {
      let mathExpression = children
      if (mathExpression.startsWith('$') && mathExpression.endsWith('$')) {
        mathExpression = mathExpression.slice(1, -1)
      }
      
      return (
        <div className={`math-block ${className}`}>
          <BlockMath>{convertToLatex(mathExpression)}</BlockMath>
        </div>
      )
    } catch (error) {
      return (
        <div className={`font-mono bg-gray-100 p-2 rounded ${className}`}>
          {children}
        </div>
      )
    }
  }

  // For mixed content (text with inline math)
  if (containsMath(children)) {
    return (
      <span className={className}>
        {renderMixedContent(children)}
      </span>
    )
  }

  // Regular text
  return <span className={className}>{children}</span>
}

// Helper component for specifically rendering equations
export function MathEquation({ children, className = '' }: { children: string; className?: string }) {
  return <MathRenderer block={true} className={className}>{children}</MathRenderer>
}

// Helper component for inline math
export function InlineMathRenderer({ children, className = '' }: { children: string; className?: string }) {
  return <MathRenderer block={false} className={className}>{children}</MathRenderer>
}
