"use client"

import React from 'react'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import { isLikelyMathDelimitedContent, normalizeQuestionText } from '@/lib/math/textNormalization'

interface MathRendererProps {
  children: string
  block?: boolean
  className?: string
}

type Segment = {
  type: 'text' | 'inlineMath' | 'blockMath'
  value: string
}

const LATEX_COMMANDS = [
  'alpha',
  'beta',
  'gamma',
  'delta',
  'theta',
  'pi',
  'sqrt',
  'frac',
  'triangle',
  'leq',
  'geq',
  'neq',
  'sin',
  'cos',
  'tan',
  'log',
  'ln',
  'pm',
  'infty',
  'cdot',
  'times',
  'left',
  'right',
  'angle',
]

const INLINE_LATEX_FRAGMENT_REGEX = new RegExp(
  String.raw`-?\d*(?:\.\d+)?\s*\\(?:${LATEX_COMMANDS.join('|')})(?:\{[^{}]*\}){0,3}(?:\s*[_^]\{[^{}]*\})*`,
  'g'
)

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

const findClosingDelimiter = (input: string, start: number, delimiter: '$' | '$$'): number => {
  for (let i = start; i < input.length; i++) {
    if (input[i] === '\\') {
      i += 1
      continue
    }

    if (delimiter === '$$') {
      if (input[i] === '$' && input[i + 1] === '$') {
        return i
      }
      continue
    }

    if (input[i] === '$' && input[i + 1] !== '$') {
      return i
    }
  }

  return -1
}

const parseDelimitedSegments = (input: string): Segment[] => {
  const segments: Segment[] = []
  let textBuffer = ''
  let cursor = 0

  const flushText = () => {
    if (!textBuffer) return
    segments.push({ type: 'text', value: textBuffer })
    textBuffer = ''
  }

  while (cursor < input.length) {
    const char = input[cursor]

    if (char === '\\' && cursor + 1 < input.length) {
      textBuffer += input.slice(cursor, cursor + 2)
      cursor += 2
      continue
    }

    if (char !== '$') {
      textBuffer += char
      cursor += 1
      continue
    }

    const isDouble = input[cursor + 1] === '$'
    const delimiter: '$' | '$$' = isDouble ? '$$' : '$'
    const delimiterLength = delimiter.length
    const contentStart = cursor + delimiterLength
    const closingIndex = findClosingDelimiter(input, contentStart, delimiter)

    if (closingIndex === -1) {
      if (!isDouble && /\d/.test(input[contentStart] ?? '')) {
        // Preserve literal currency dollar.
        textBuffer += '$'
      }
      cursor += delimiterLength
      continue
    }

    const rawMathContent = input.slice(contentStart, closingIndex)
    if (!isLikelyMathDelimitedContent(rawMathContent)) {
      // Treat this as literal text (for example currency), not math delimiter.
      textBuffer += delimiter
      cursor += delimiterLength
      continue
    }

    flushText()
    const mathContent = rawMathContent.trim()
    if (mathContent) {
      segments.push({
        type: delimiter === '$$' ? 'blockMath' : 'inlineMath',
        value: mathContent,
      })
    }

    cursor = closingIndex + delimiterLength
  }

  flushText()
  return segments
}

const splitInlineLatexFragments = (value: string): Segment[] => {
  if (!value.includes('\\')) {
    return value ? [{ type: 'text', value }] : []
  }

  const fragments: Segment[] = []
  let lastIndex = 0

  for (const match of value.matchAll(INLINE_LATEX_FRAGMENT_REGEX)) {
    if (typeof match.index !== 'number') continue

    const start = match.index
    const end = start + match[0].length

    if (start > lastIndex) {
      fragments.push({
        type: 'text',
        value: value.slice(lastIndex, start),
      })
    }

    const mathCandidate = match[0].trim()
    if (mathCandidate) {
      fragments.push({ type: 'inlineMath', value: mathCandidate })
    }

    lastIndex = end
  }

  if (lastIndex < value.length) {
    fragments.push({
      type: 'text',
      value: value.slice(lastIndex),
    })
  }

  if (fragments.length === 0) {
    return [{ type: 'text', value }]
  }

  return fragments
}

const expandPlainTextSegments = (segments: Segment[]): Segment[] => {
  const expanded: Segment[] = []

  segments.forEach((segment) => {
    if (segment.type !== 'text') {
      expanded.push(segment)
      return
    }

    expanded.push(...splitInlineLatexFragments(segment.value))
  })

  return expanded
}

const buildSegments = (input: string): Segment[] => {
  const delimiterSegments = parseDelimitedSegments(input)
  return expandPlainTextSegments(delimiterSegments)
}

/**
 * MathRenderer component for displaying mathematical equations
 * Automatically detects and renders LaTeX math expressions
 * Includes screen reader support via aria-label
 */
export default function MathRenderer({ children, block = false, className = '' }: MathRendererProps) {
  const normalized = normalizeQuestionText(children)
  const segments = buildSegments(normalized)

  const renderInlineSegment = (segment: Segment, key: string) => {
    if (segment.type === 'text') {
      return <span key={key}>{segment.value}</span>
    }

    const screenReaderText = latexToText(segment.value)

    try {
      if (segment.type === 'blockMath') {
        return (
          <div key={key} role="img" aria-label={screenReaderText} className="my-2">
            <BlockMath>{segment.value}</BlockMath>
          </div>
        )
      }

      return (
        <span key={key} role="img" aria-label={screenReaderText}>
          <InlineMath>{segment.value}</InlineMath>
        </span>
      )
    } catch {
      return (
        <span key={key} className="font-mono bg-gray-100 px-1 rounded">
          {segment.value}
        </span>
      )
    }
  }

  if (block) {
    const nonEmptySegments = segments.filter((segment) => segment.value.trim().length > 0)
    const singleMathSegment =
      nonEmptySegments.length === 1 &&
      (nonEmptySegments[0].type === 'inlineMath' || nonEmptySegments[0].type === 'blockMath')

    if (singleMathSegment) {
      const math = nonEmptySegments[0].value
      const screenReaderText = latexToText(math)

      try {
        return (
          <div className={`math-block ${className}`} role="img" aria-label={screenReaderText}>
            <BlockMath>{math}</BlockMath>
          </div>
        )
      } catch {
        return (
          <div className={`font-mono bg-gray-100 p-2 rounded ${className}`}>
            {math}
          </div>
        )
      }
    }

    return (
      <div className={className}>
        {segments.map((segment, index) => renderInlineSegment(segment, `segment-${index}`))}
      </div>
    )
  }

  if (segments.length === 0) {
    return <span className={className}>{normalized}</span>
  }

  return (
    <span className={className}>
      {segments.map((segment, index) => renderInlineSegment(segment, `segment-${index}`))}
    </span>
  )
}

// Helper component for specifically rendering equations
export function MathEquation({ children, className = '' }: { children: string; className?: string }) {
  return <MathRenderer block={true} className={className}>{children}</MathRenderer>
}

// Helper component for inline math
export function InlineMathRenderer({ children, className = '' }: { children: string; className?: string }) {
  return <MathRenderer block={false} className={className}>{children}</MathRenderer>
}
