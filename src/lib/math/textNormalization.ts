const HTML_ENTITY_REPLACEMENTS: Record<string, string> = {
  '&nbsp;': ' ',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&amp;': '&',
};

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
  'overline',
  'angle',
  'sum',
  'int',
  'text',
];

const DOUBLE_SLASH_LATEX_COMMAND_REGEX = new RegExp(
  String.raw`\\\\(?=(?:${LATEX_COMMANDS.join('|')})\b)`,
  'g'
);

const CURRENCY_WORD_REGEX = /\b(dollar|dollars|usd|fee|fees|cost|company|service|month|months|day|days|hour|hours|per)\b/i;
const SHORT_VARIABLE_REGEX = /^[A-Za-z]{1,3}(?:_[A-Za-z0-9]+)?$/;
const COORDINATE_REGEX = /^\(?\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)?$/;

function shouldPreserveLiteralDollar(input: string, cursor: number, isDouble: boolean): boolean {
  if (isDouble) {
    return false;
  }

  const nextChar = input[cursor + 1] ?? '';
  return /\d/.test(nextChar);
}

export function isLikelyMathDelimitedContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) {
    return false;
  }

  if (CURRENCY_WORD_REGEX.test(trimmed) && !/[=<>^_{}+\-*/]|\\[a-zA-Z]+/.test(trimmed)) {
    return false;
  }

  if (/\\[a-zA-Z]+/.test(trimmed)) {
    return true;
  }

  if (/[=<>^_{}]/.test(trimmed)) {
    return true;
  }

  if (/\d+\s*\/\s*\d+/.test(trimmed)) {
    return true;
  }

  if (/[+\-*/]/.test(trimmed) && /[A-Za-z0-9]/.test(trimmed)) {
    return true;
  }

  if (COORDINATE_REGEX.test(trimmed)) {
    return true;
  }

  if (SHORT_VARIABLE_REGEX.test(trimmed)) {
    return true;
  }

  if (/^[A-Za-z]\([^)]+\)$/.test(trimmed)) {
    return true;
  }

  return false;
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;|&lt;|&gt;|&quot;|&apos;|&#39;|&amp;/g, (entity) => {
      return HTML_ENTITY_REPLACEMENTS[entity] ?? entity;
    })
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function normalizeLatexCommandSlashes(value: string): string {
  return value.replace(DOUBLE_SLASH_LATEX_COMMAND_REGEX, '\\');
}

function findClosingDelimiter(input: string, start: number, delimiter: '$' | '$$'): number {
  for (let i = start; i < input.length; i++) {
    if (input[i] === '\\') {
      i += 1;
      continue;
    }

    if (delimiter === '$$') {
      if (input[i] === '$' && input[i + 1] === '$') {
        return i;
      }
      continue;
    }

    if (input[i] !== '$') {
      continue;
    }

    if (input[i + 1] === '$') {
      i += 1;
      continue;
    }

    return i;
  }

  return -1;
}

export function removeOrphanDollarDelimiters(value: string): string {
  if (!value.includes('$')) {
    return value;
  }

  let output = '';
  let cursor = 0;

  while (cursor < value.length) {
    const char = value[cursor];

    if (char === '\\' && cursor + 1 < value.length) {
      output += value.slice(cursor, cursor + 2);
      cursor += 2;
      continue;
    }

    if (char !== '$') {
      output += char;
      cursor += 1;
      continue;
    }

    const isDouble = value[cursor + 1] === '$';
    const delimiter: '$' | '$$' = isDouble ? '$$' : '$';
    const delimiterLength = delimiter.length;
    const contentStart = cursor + delimiterLength;
    const closingIndex = findClosingDelimiter(value, contentStart, delimiter);

    if (closingIndex === -1) {
      if (shouldPreserveLiteralDollar(value, cursor, isDouble)) {
        output += delimiter;
      }
      cursor += delimiterLength;
      continue;
    }

    const delimitedContent = value.slice(contentStart, closingIndex);
    if (!isLikelyMathDelimitedContent(delimitedContent)) {
      // Keep literal dollars for currency/plain text and continue scanning.
      output += delimiter;
      cursor += delimiterLength;
      continue;
    }

    output += delimiter;
    output += delimitedContent;
    output += delimiter;

    cursor = closingIndex + delimiterLength;
  }

  return output;
}

export function normalizeQuestionText(value: unknown): string {
  if (value == null) {
    return '';
  }

  const asString = typeof value === 'string' ? value : String(value);
  const strippedQuotes = asString.replace(/^\s*["']|["']\s*$/g, '');
  const decoded = decodeHtmlEntities(strippedQuotes);
  const normalizedSlashes = normalizeLatexCommandSlashes(decoded);
  return removeOrphanDollarDelimiters(normalizedSlashes);
}

export function normalizeQuestionOptions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((option) => normalizeQuestionText(option));
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((option) => normalizeQuestionText(option));
      }
    } catch {
      return [];
    }
  }

  return [];
}

export function normalizeDeepText(value: unknown): unknown {
  if (typeof value === 'string') {
    return normalizeQuestionText(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeDeepText(item))
  }

  if (value && typeof value === 'object') {
    const normalizedObject: Record<string, unknown> = {}
    Object.entries(value as Record<string, unknown>).forEach(([key, nestedValue]) => {
      normalizedObject[key] = normalizeDeepText(nestedValue)
    })
    return normalizedObject
  }

  return value
}
