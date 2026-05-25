const OPTION_PREFIX_RE = /^\s*(?:\(?[A-Da-d]\)?[.):]?)\s*/

export function normalizeOptionText(option: string): string {
  return option.replace(OPTION_PREFIX_RE, '').trim()
}

export function normalizeOptionTexts(options: string[]): string[] {
  return options.map((option) => normalizeOptionText(option || ''))
}