/**
 * LaTeX Normalization Library
 * 
 * Provides functions to normalize LaTeX expressions for consistent rendering with KaTeX.
 * 
 * Key principles:
 * - Database stores single backslash: $\frac{1}{2}$
 * - All LaTeX wrapped in $...$ delimiters
 * - Normalization is idempotent (safe to run multiple times)
 * 
 * @see docs/specs/SPEC-LATEX-001.md
 * @see docs/adr/ADR-LATEX-001.md
 */

import katex from 'katex';

/**
 * List of supported LaTeX commands (without leading backslash)
 */
const LATEX_COMMANDS = [
  // Fractions and roots
  'frac', 'tfrac', 'dfrac', 'sqrt', 'binom', 'tbinom',
  
  // Text formatting
  'text', 'textbf', 'textit', 'mathrm', 'mathbf', 'mathit',
  
  // Operators
  'cdot', 'times', 'pm', 'div', 'pm', 'mp',
  
  // Greek letters
  'pi', 'theta', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta',
  'eta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'rho', 'sigma',
  'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi', 'Omega',
  
  // Geometry
  'angle', 'triangle', 'parallel', 'perp', 'cong', 'sim', 'circ', 'degree',
  
  // Decorations
  'overline', 'underline', 'hat', 'bar', 'tilde', 'dot', 'ddot',
  
  // Delimiters (large)
  'bigl', 'bigr', 'Bigl', 'Bigr', 'left', 'right',
  'Big', 'big', 'bigg', 'Bigg',
  
  // Relations
  'leq', 'geq', 'neq', 'approx', 'equiv', 'propto',
  
  // Calculus
  'infty', 'sum', 'prod', 'int', 'lim', 'partial',
  
  // Trigonometry
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh',
  
  // Logarithms
  'log', 'ln', 'lg',
  
  // Spacing
  'quad', 'qquad', 'hspace', 'vspace',
  
  // Misc
  'boxed', 'cancel', 'phantom', 'href'
];

/**
 * Validation result from validateLatex()
 */
export interface ValidationResult {
  isValid: boolean;
  totalExpressions: number;
  validExpressions: number;
  errors: Array<{
    expression: string;
    error: string;
    position: number;
  }>;
}

/**
 * Normalize LaTeX expressions in text for consistent KaTeX rendering.
 * 
 * Transformations (in order):
 * 1. Remove control characters (TAB, FF, BS, CR, NULL)
 * 2. Collapse multiple backslashes to single (\\\frac → \frac)
 * 3. Remove \newline commands (KaTeX error source)
 * 4. Ensure reasonable dollar sign delimiters (don't auto-wrap, just balance)
 * 
 * @param text - Input text (may or may not contain LaTeX)
 * @returns Normalized text with clean LaTeX
 * 
 * @example
 * normalizeLatex("The fraction $\\\\frac{1}{2}$") 
 * // Returns: "The fraction $\frac{1}{2}$" (collapsed double backslash)
 * 
 * @example
 * normalizeLatex("$\\frac{1}{2}$") 
 * // Returns: "$\frac{1}{2}$" (already clean)
 */
export function normalizeLatex(text: string): string {
  if (!text) return text;
  
  let result = text;
  
  try {
    // Step 1: Remove control characters
    // Matches: TAB(\t), LF(\n) is kept, VT(\v), FF(\f), CR(\r), and other control chars
    result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    
    // Step 1.5: Replace literal \n (backslash-n) with actual newlines
    // LLMs sometimes return escaped newlines as literal "\n" strings
    result = result.replace(/\\n/g, '\n');
    
    // Step 2: Collapse multiple backslashes before each LaTeX command
    // Iterative approach: keep replacing \\\\ with \\ until no more exist
    let prevLength = 0;
    while (result.length !== prevLength && result.includes('\\\\\\\\')) {
      prevLength = result.length;
      result = result.replace(/\\\\\\\\/g, '\\\\');
    }
    
    // Now collapse \\command to \command for each known command
    for (const cmd of LATEX_COMMANDS) {
      // Match two or more backslashes before command  
      const multiBackslashRegex = new RegExp(`\\\\{2,}(${cmd})\\b`, 'g');
      result = result.replace(multiBackslashRegex, `\\${cmd}`);
    }
    
    // Step 3: Remove \newline (causes KaTeX errors in display mode)
    result = result.replace(/\\newline/g, ' ');
    
    // Step 4: Wrap LaTeX expressions in $...$ if not already wrapped
    result = wrapLatexIntelligently(result);
    
    // Step 5: Balance dollar signs (ensure even count)
    result = balanceDollarSigns(result);
    
    return result;
  } catch (error) {
    // On error, return input unchanged (defensive)
    console.error('Error normalizing LaTeX:', error);
    return text;
  }
}

/**
 * Intelligently wrap LaTeX expressions in $...$ delimiters.
 * 
 * Strategy:
 * - Identify complete LaTeX expressions (handle paired delimiters)
 * - Wrap each expression if not already wrapped
 * - Preserve existing $...$ regions
 * 
 * @param text - Text with LaTeX commands
 * @returns Text with LaTeX wrapped in delimiters
 */
function wrapLatexIntelligently(text: string): string {
  if (!text.includes('\\')) return text;
  
  // Strategy: Find all LaTeX command positions, group into expressions, wrap each
  let result = '';
  let i = 0;
  
  while (i < text.length) {
    // Check if we're starting a LaTeX command
    if (text[i] === '\\' && i + 1 < text.length && /[a-zA-Z]/.test(text[i + 1])) {
      // Check if already inside $...$
      const beforeText = text.slice(0, i);
      const dollarCount = (beforeText.match(/(?<!\\)\$/g) || []).length;
      
      if (dollarCount % 2 === 1) {
        // Already inside math mode, just copy the character
        result += text[i];
        i++;
        continue;
      }
      
      // Not in math mode - find the complete expression and wrap it
      const exprStart = i;
      const exprEnd = findCompleteExpressionEnd(text, i);
      const expression = text.slice(exprStart, exprEnd);
      
      // Wrap in $...$
      result += '$' + expression + '$';
      i = exprEnd;
    } else if (text[i] === '$' && (i === 0 || text[i - 1] !== '\\')) {
      // Copy existing dollar sign
      result += text[i];
      i++;
    } else {
      // Regular character
      result += text[i];
      i++;
    }
  }
  
  return result;
}

/**
 * Legacy function kept for compatibility
 */
function wrapLatexExpressions(text: string): string {
  // Quick check: if no backslashes, no LaTeX to wrap
  if (!text.includes('\\')) return text;
  
  // Track positions of existing $ delimiters
  const dollarPositions: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '$' && (i === 0 || text[i - 1] !== '\\')) {
      dollarPositions.push(i);
    }
  }
  
  // Build regex to find LaTeX commands
  const commandPattern = new RegExp(`\\\\(${LATEX_COMMANDS.join('|')})\\b`, 'g');
  let match: RegExpExecArray | null;
  const wrappingNeeded: Array<{ start: number; end: number }> = [];
  
  while ((match = commandPattern.exec(text)) !== null) {
    const commandStart = match.index;
    
    // Check if this command is already inside $...$
    const isInsideDollars = isPositionInsideDollars(commandStart, dollarPositions);
    
    if (!isInsideDollars) {
      // Find the expression boundary (start and end)
      const exprStart = findExpressionStart(text, commandStart);
      const exprEnd = findExpressionEnd(text, commandStart);
      
      // Check if we already plan to wrap this region
      const alreadyPlanned = wrappingNeeded.some(
        region => region.start <= exprStart && region.end >= exprEnd
      );
      
      if (!alreadyPlanned) {
        wrappingNeeded.push({ start: exprStart, end: exprEnd });
      }
    }
  }
  
  // Sort by start position (descending) so we can insert from right to left
  wrappingNeeded.sort((a, b) => b.start - a.start);
  
  // Apply wrapping (right to left to preserve indices)
  let result = text;
  for (const region of wrappingNeeded) {
    result = result.slice(0, region.start) + '$' + result.slice(region.start, region.end) + '$' + result.slice(region.end);
  }
  
  return result;
}

/**
 * Check if a position is inside a $...$ pair
 */
function isPositionInsideDollars(position: number, dollarPositions: number[]): boolean {
  let insideCount = 0;
  for (const dollarPos of dollarPositions) {
    if (dollarPos < position) {
      insideCount++;
    } else {
      break;
    }
  }
  // Odd count means we're inside (passed opening $ but not closing $)
  return insideCount % 2 === 1;
}

/**
 * Find where a LaTeX expression starts (scan backwards for whitespace or start of string)
 */
function findExpressionStart(text: string, commandPos: number): number {
  // Scan backwards to find expression start
  // Stop at: whitespace, punctuation (but not math operators), start of string
  let start = commandPos;
  
  // Move back to include leading characters like "A = " in "A = \frac{1}{2}"
  while (start > 0) {
    const char = text[start - 1];
    
    // Stop before whitespace (space, tab, newline)
    if (/\s/.test(char)) break;
    
    // Stop before sentence punctuation
    if (/[.!?;:]/.test(char)) break;
    
    // Stop before opening brackets/parens (but include them if they're LaTeX delimiters)
    if (/[({[]/.test(char) && start > 1 && text[start - 2] !== '\\') break;
    
    start--;
  }
  
  return start;
}

/**
 * Find the end of a complete LaTeX expression starting at position i.
 * Handles nested braces, paired delimiters, subscripts/superscripts.
 */
function findCompleteExpressionEnd(text: string, start: number): number {
  let i = start;
  let braceDepth = 0;
  let inCommand = false;
  
  while (i < text.length) {
    const char = text[i];
    
    // Handle backslash (command start)
    if (char === '\\') {
      if (i + 1 < text.length && /[a-zA-Z]/.test(text[i + 1])) {
        // Command name
        inCommand = true;
        i++;
        // Skip command name
        while (i < text.length && /[a-zA-Z]/.test(text[i])) {
          i++;
        }
        continue;
      } else {
        // Symbol like \{, \}, etc.
        i += 2;
        continue;
      }
    }
    
    // Handle braces
    if (char === '{') {
      braceDepth++;
      i++;
      continue;
    }
    
    if (char === '}') {
      braceDepth--;
      i++;
      if (braceDepth === 0 && !inCommand) {
        // Check if more expression follows
        if (i < text.length && (text[i] === '_' || text[i] === '^')) {
          inCommand = true;
          i++;
          continue;
        }
        // Check for another command immediately after
        if (i < text.length && text[i] === '\\') {
          continue;
        }
        // Expression complete
        return i;
      }
      continue;
    }
    
    // Handle subscript/superscript
    if ((char === '_' || char === '^') && braceDepth === 0) {
      inCommand = true;
      i++;
      continue;
    }
    
    // If we're at depth 0 and hit whitespace/punctuation, stop
    if (braceDepth === 0 && /[\s,.;!?]/.test(char)) {
      return i;
    }
    
    // Inside braces or command, keep going
    i++;
  }
  
  return i;
}

/**
 * Find where a LaTeX expression ends (scan forwards through braces, commands)
 */
function findExpressionEnd(text: string, commandPos: number): number {
  // Scan forwards to find expression end
  // Continue through: \command{...}, nested braces, subscripts/superscripts
  let end = commandPos;
  let braceDepth = 0;
  
  while (end < text.length) {
    const char = text[end];
    
    if (char === '{') {
      braceDepth++;
      end++;
      continue;
    }
    
    if (char === '}') {
      braceDepth--;
      end++;
      // If we've closed all braces, check next char
      if (braceDepth === 0) {
        // Peek ahead: is there a subscript/superscript?
        if (end < text.length && (text[end] === '_' || text[end] === '^')) {
          continue; // Keep going
        }
        // Is there another LaTeX command immediately after?
        if (end < text.length && text[end] === '\\') {
          continue; // Keep going
        }
        // Otherwise, stop here
        break;
      }
      continue;
    }
    
    if (braceDepth === 0) {
      // We're not inside braces
      // Stop at whitespace or punctuation
      if (/[\s.!?;:,]/.test(char)) break;
      
      // Continue through operators, digits, letters in math mode
      if (/[\w+\-*/=<>|_^\\]/.test(char)) {
        end++;
        continue;
      }
      
      // Unknown character, stop
      break;
    }
    
    // Inside braces, keep going
    end++;
  }
  
  return end;
}

/**
 * Balance dollar sign delimiters (ensure even count)
 */
function balanceDollarSigns(text: string): string {
  // Count unescaped dollar signs
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '$' && (i === 0 || text[i - 1] !== '\\')) {
      count++;
    }
  }
  
  // If odd count, append a $ at the end (defensive fallback)
  if (count % 2 === 1) {
    return text + '$';
  }
  
  return text;
}

/**
 * Validate LaTeX expressions using KaTeX parser.
 * 
 * Checks:
 * - No control characters
 * - No double backslashes before commands
 * - All expressions wrapped in $...$
 * - KaTeX can parse each expression
 * 
 * @param text - Text to validate (should be post-normalization)
 * @returns Validation result with errors (if any)
 */
export function validateLatex(text: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    totalExpressions: 0,
    validExpressions: 0,
    errors: []
  };
  
  if (!text) return result;
  
  try {
    // Check 1: No control characters
    const controlCharMatch = text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/);
    if (controlCharMatch) {
      result.isValid = false;
      result.errors.push({
        expression: '',
        error: `Control character found: ${JSON.stringify(controlCharMatch[0])}`,
        position: controlCharMatch.index ?? 0
      });
    }
    
    // Check 2: No double backslashes before commands
    for (const cmd of LATEX_COMMANDS) {
      const doubleBackslashRegex = new RegExp(`\\\\{2,}${cmd}\\b`);
      if (doubleBackslashRegex.test(text)) {
        result.isValid = false;
        result.errors.push({
          expression: '',
          error: `Double backslash found before \\${cmd}`,
          position: 0
        });
      }
    }
    
    // Check 3: Extract all $...$ expressions and validate with KaTeX
    const expressions = extractLatexExpressions(text);
    result.totalExpressions = expressions.length;
    
    for (const expr of expressions) {
      try {
        // Try to render with KaTeX (throws on error)
        katex.renderToString(expr.content, {
          throwOnError: true,
          strict: false,
          trust: false
        });
        result.validExpressions++;
      } catch (error: any) {
        result.isValid = false;
        result.errors.push({
          expression: expr.content,
          error: error.message || 'KaTeX parse error',
          position: expr.position
        });
      }
    }
    
    return result;
  } catch (error: any) {
    result.isValid = false;
    result.errors.push({
      expression: '',
      error: `Validation error: ${error.message}`,
      position: 0
    });
    return result;
  }
}

/**
 * Extract LaTeX expressions (content inside $...$) from text.
 */
function extractLatexExpressions(text: string): Array<{ content: string; position: number }> {
  const expressions: Array<{ content: string; position: number }> = [];
  let inMath = false;
  let mathStart = 0;
  
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '$' && (i === 0 || text[i - 1] !== '\\')) {
      if (!inMath) {
        // Entering math mode
        inMath = true;
        mathStart = i + 1;
      } else {
        // Exiting math mode
        const content = text.slice(mathStart, i);
        expressions.push({ content, position: mathStart });
        inMath = false;
      }
    }
  }
  
  return expressions;
}

/**
 * Normalize LaTeX in a JSON options array (stored as string in DB).
 * 
 * @param optionsJson - JSON string like '["$\\frac{1}{2}$", "3"]'
 * @returns Normalized JSON string
 */
export function normalizeLatexInOptions(optionsJson: string): string {
  try {
    const options = JSON.parse(optionsJson);
    if (!Array.isArray(options)) return optionsJson;
    
    const normalized = options.map(opt => 
      typeof opt === 'string' ? normalizeLatex(opt) : opt
    );
    
    return JSON.stringify(normalized);
  } catch (error) {
    console.error('Error normalizing options JSON:', error);
    return optionsJson;
  }
}

/**
 * Normalize LaTeX in a JSON wrongAnswerExplanations object (stored as string in DB).
 * 
 * @param explanationsJson - JSON string like '{"0": "Explanation...", "1": "..."}'
 * @returns Normalized JSON string
 */
export function normalizeLatexInExplanations(explanationsJson: string | null): string | null {
  if (!explanationsJson) return explanationsJson;
  
  try {
    const explanations = JSON.parse(explanationsJson);
    if (typeof explanations !== 'object') return explanationsJson;
    
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(explanations)) {
      normalized[key] = typeof value === 'string' ? normalizeLatex(value) : value as string;
    }
    
    return JSON.stringify(normalized);
  } catch (error) {
    console.error('Error normalizing explanations JSON:', error);
    return explanationsJson;
  }
}
