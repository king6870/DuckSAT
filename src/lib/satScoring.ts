/**
 * SAT 400–1600 Scoring Engine
 *
 * Converts raw correct counts into scaled section scores (200–800)
 * using piecewise-linear interpolation that approximates real
 * College Board conversion tables for the Digital SAT.
 */

export interface SATScores {
  ebrw: number      // 200–800  Evidence-Based Reading & Writing
  math: number      // 200–800
  composite: number  // 400–1600
}

// [rawCorrect, scaledScore] anchor points
const EBRW_TABLE: [number, number][] = [
  [0, 200],
  [5, 260],
  [10, 320],
  [15, 380],
  [20, 430],
  [25, 480],
  [30, 520],
  [35, 570],
  [40, 620],
  [44, 670],
  [48, 720],
  [51, 760],
  [54, 800],
]

const MATH_TABLE: [number, number][] = [
  [0, 200],
  [4, 260],
  [8, 320],
  [12, 380],
  [16, 430],
  [20, 490],
  [24, 540],
  [28, 590],
  [32, 640],
  [35, 680],
  [38, 720],
  [41, 760],
  [44, 800],
]

/** Piecewise-linear interpolation */
function interpolate(raw: number, table: [number, number][]): number {
  if (raw <= table[0][0]) return table[0][1]
  if (raw >= table[table.length - 1][0]) return table[table.length - 1][1]

  for (let i = 0; i < table.length - 1; i++) {
    const [r1, s1] = table[i]
    const [r2, s2] = table[i + 1]
    if (raw >= r1 && raw <= r2) {
      const t = (raw - r1) / (r2 - r1)
      return Math.round(s1 + t * (s2 - s1))
    }
  }
  return table[table.length - 1][1]
}

/**
 * Compute SAT section and composite scores.
 *
 * If the actual question counts differ from the canonical 54 / 44,
 * the raw score is proportionally scaled before lookup so the
 * 200–800 range stays meaningful.
 */
export function computeSATScores(
  ebrwRaw: number,
  ebrwTotal: number,
  mathRaw: number,
  mathTotal: number,
): SATScores {
  const EBRW_MAX = 54
  const MATH_MAX = 44

  const scaledEbrwRaw =
    ebrwTotal > 0 ? Math.round((ebrwRaw / ebrwTotal) * EBRW_MAX) : 0
  const scaledMathRaw =
    mathTotal > 0 ? Math.round((mathRaw / mathTotal) * MATH_MAX) : 0

  const ebrw = interpolate(scaledEbrwRaw, EBRW_TABLE)
  const math = interpolate(scaledMathRaw, MATH_TABLE)

  return { ebrw, math, composite: ebrw + math }
}
