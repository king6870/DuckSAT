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
 * Convert LaTeX to screen reader friendly text
 * This helps visually impaired users understand mathematical expressions
 */
const latexToText = (latex: string): string => {
  return latex
    // Fractions
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
    // Square root
    .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
    // Exponents
    .replace(/\^(\d+)/g, ' to the power of $1')
    .replace(/\^\{([^}]+)\}/g, ' to the power of $1')
    // Subscripts
    .replace(/_(\d+)/g, ' subscript $1')
    .replace(/\_\{([^}]+)\}/g, ' subscript $1')
    // Greek letters
    .replace(/\\pi\b/g, 'pi')
    .replace(/\\theta\b/g, 'theta')
    .replace(/\\alpha\b/g, 'alpha')
    .replace(/\\beta\b/g, 'beta')
    .replace(/\\gamma\b/g, 'gamma')
    .replace(/\\delta\b/g, 'delta')
    // Infinity
    .replace(/\\infty/g, 'infinity')
    // Plus/minus
    .replace(/\\pm/g, 'plus or minus')
    // Degree
    .replace(/\^\\circ/g, ' degrees')
    // Inequalities
    .replace(/\\leq/g, ' less than or equal to ')
    .replace(/\\geq/g, ' greater than or equal to ')
    .replace(/\\neq/g, ' not equal to ')
    // Functions
    .replace(/\\sin/g, 'sine')
    .replace(/\\cos/g, 'cosine')
    .replace(/\\tan/g, 'tangent')
    .replace(/\\log/g, 'logarithm')
    .replace(/\\ln/g, 'natural logarithm')
    // Clean up remaining LaTeX commands
    .replace(/\\/g, '')
    .replace(/\{/g, '')
    .replace(/\}/g, '')
    .trim()
}

/**
 * MathRenderer component for displaying mathematical equations
 * Automatically detects and renders LaTeX math expressions
 * Includes screen reader support via aria-label
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
        const latexExpression = convertToLatex(mathExpression)
        const screenReaderText = latexToText(latexExpression)
        
        parts.push(
          <span key={`math-${match.index}`} role="img" aria-label={screenReaderText}>
            <InlineMath>
              {latexExpression}
            </InlineMath>
          </span>
        )
      } catch {
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
      
      const latexExpression = convertToLatex(mathExpression)
      const screenReaderText = latexToText(latexExpression)
      
      return (
        <div 
          className={`math-block ${className}`}
          role="img"
          aria-label={screenReaderText}
        >
          <BlockMath>{latexExpression}</BlockMath>
        </div>
      )
    } catch {
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
