// SAT Scoring System (400-1600 scale)

interface QuestionResultData {
  questionId: string
  userAnswer: number
  isCorrect: boolean
  timeSpent: number
  moduleType?: string
  difficulty?: string
  category?: string
  question: {
    moduleType: string
    difficulty: string
    category: string
    subtopic?: string
  }
}

export interface SATScore {
  totalScore: number // 400-1600
  readingWritingScore: number // 200-800
  mathScore: number // 200-800
  percentile: number // 1-99
  scoreBreakdown: {
    readingWriting: {
      rawScore: number
      scaledScore: number
      percentCorrect: number
    }
    math: {
      rawScore: number
      scaledScore: number
      percentCorrect: number
    }
  }
}

export interface DetailedAnalytics {
  satScore: SATScore
  categoryPerformance: Record<string, {
    correct: number
    total: number
    percentage: number
    strength: 'strong' | 'average' | 'weak'
  }>
  difficultyAnalysis: {
    easy: { correct: number; total: number; percentage: number }
    medium: { correct: number; total: number; percentage: number }
    hard: { correct: number; total: number; percentage: number }
  }
  timeAnalysis: {
    totalTime: number
    averagePerQuestion: number
    efficiency: 'fast' | 'optimal' | 'slow'
  }
  recommendations: string[]
  targetScore: number
  improvementAreas: string[]
}

// SAT Raw Score to Scaled Score Conversion Tables
const READING_WRITING_SCALE: Record<number, number> = {
  0: 200, 1: 210, 2: 220, 3: 230, 4: 240, 5: 250, 6: 260, 7: 270, 8: 280, 9: 290,
  10: 300, 11: 310, 12: 320, 13: 330, 14: 340, 15: 350, 16: 360, 17: 370, 18: 380, 19: 390,
  20: 400, 21: 410, 22: 420, 23: 430, 24: 440, 25: 450, 26: 460, 27: 470, 28: 480, 29: 490,
  30: 500, 31: 510, 32: 520, 33: 530, 34: 540, 35: 550, 36: 560, 37: 570, 38: 580, 39: 590,
  40: 600, 41: 610, 42: 620, 43: 630, 44: 640, 45: 650, 46: 660, 47: 670, 48: 680, 49: 690,
  50: 700, 51: 720, 52: 740, 53: 760, 54: 780, 55: 800
}

const MATH_SCALE: Record<number, number> = {
  0: 200, 1: 210, 2: 220, 3: 230, 4: 240, 5: 250, 6: 260, 7: 270, 8: 280, 9: 290,
  10: 300, 11: 320, 12: 340, 13: 360, 14: 380, 15: 400, 16: 420, 17: 440, 18: 460, 19: 480,
  20: 500, 21: 520, 22: 540, 23: 560, 24: 580, 25: 600, 26: 620, 27: 640, 28: 660, 29: 680,
  30: 700, 31: 720, 32: 740, 33: 760, 34: 780, 35: 790, 36: 800, 37: 800, 38: 800, 39: 800,
  40: 800, 41: 800, 42: 800, 43: 800, 44: 800
}

// Percentile mapping (approximate)
const PERCENTILE_MAP: Record<number, number> = {
  400: 1, 450: 5, 500: 10, 550: 20, 600: 35, 650: 50, 700: 65, 750: 80, 800: 90, 850: 95,
  900: 97, 950: 98, 1000: 99, 1050: 99, 1100: 99, 1150: 99, 1200: 99, 1250: 99,
  1300: 99, 1350: 99, 1400: 99, 1450: 99, 1500: 99, 1550: 99, 1600: 99
}

export function calculateSATScore(
  readingWritingCorrect: number,
  readingWritingTotal: number,
  mathCorrect: number,
  mathTotal: number
): SATScore {
  // Safety checks
  if (readingWritingCorrect < 0) readingWritingCorrect = 0
  if (mathCorrect < 0) mathCorrect = 0
  if (readingWritingTotal <= 0) readingWritingTotal = 1
  if (mathTotal <= 0) mathTotal = 1
  
  // Calculate raw scores
  const rwRawScore = Math.min(readingWritingCorrect, 54) // Max 54 for R&W
  const mathRawScore = Math.min(mathCorrect, 44) // Max 44 for Math
  
  // Convert to scaled scores
  const rwScaledScore = READING_WRITING_SCALE[rwRawScore] || 200
  const mathScaledScore = MATH_SCALE[mathRawScore] || 200
  
  // Total score
  const totalScore = rwScaledScore + mathScaledScore
  
  // Calculate percentile
  const percentile = getPercentile(totalScore)
  
  return {
    totalScore,
    readingWritingScore: rwScaledScore,
    mathScore: mathScaledScore,
    percentile,
    scoreBreakdown: {
      readingWriting: {
        rawScore: rwRawScore,
        scaledScore: rwScaledScore,
        percentCorrect: Math.round((readingWritingCorrect / readingWritingTotal) * 100)
      },
      math: {
        rawScore: mathRawScore,
        scaledScore: mathScaledScore,
        percentCorrect: Math.round((mathCorrect / mathTotal) * 100)
      }
    }
  }
}

function getPercentile(totalScore: number): number {
  const scores = Object.keys(PERCENTILE_MAP).map(Number).sort((a, b) => a - b)
  
  for (let i = 0; i < scores.length; i++) {
    if (totalScore <= scores[i]) {
      return PERCENTILE_MAP[scores[i]]
    }
  }
  
  return 99 // Top percentile
}

export function generateDetailedAnalytics(
  questionResults: QuestionResultData[],
  totalTimeSpent: number
): DetailedAnalytics {
  // Safety checks
  if (!questionResults || questionResults.length === 0) {
    throw new Error('No question results provided')
  }

  if (!totalTimeSpent || totalTimeSpent < 0) {
    totalTimeSpent = 0
  }

  // Separate by module type
  const rwQuestions = questionResults.filter(q => q.moduleType === 'reading-writing')
  const mathQuestions = questionResults.filter(q => q.moduleType === 'math')
  
  const rwCorrect = rwQuestions.filter(q => q.isCorrect).length
  const mathCorrect = mathQuestions.filter(q => q.isCorrect).length
  
  // Calculate SAT score
  const satScore = calculateSATScore(rwCorrect, rwQuestions.length, mathCorrect, mathQuestions.length)
  
  // Category performance analysis
  const categoryStats: Record<string, { correct: number; total: number; percentage: number; strength: 'strong' | 'average' | 'weak' }> = {}
  
  questionResults.forEach(q => {
    const category = q.category || q.question?.category || 'Unknown'
    if (!categoryStats[category]) {
      categoryStats[category] = { correct: 0, total: 0, percentage: 0, strength: 'average' }
    }
    categoryStats[category].total++
    if (q.isCorrect) categoryStats[category].correct++
  })
  
  // Calculate percentages and strengths
  Object.keys(categoryStats).forEach(category => {
    const stats = categoryStats[category]
    stats.percentage = Math.round((stats.correct / stats.total) * 100)
    stats.strength = stats.percentage >= 80 ? 'strong' : stats.percentage >= 60 ? 'average' : 'weak'
  })
  
  // Difficulty analysis
  const difficultyStats = {
    easy: { correct: 0, total: 0, percentage: 0 },
    medium: { correct: 0, total: 0, percentage: 0 },
    hard: { correct: 0, total: 0, percentage: 0 }
  }
  
  questionResults.forEach(q => {
    const difficulty = q.difficulty as 'easy' | 'medium' | 'hard'
    difficultyStats[difficulty].total++
    if (q.isCorrect) difficultyStats[difficulty].correct++
  })
  
  Object.keys(difficultyStats).forEach(difficulty => {
    const stats = difficultyStats[difficulty as 'easy' | 'medium' | 'hard']
    stats.percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
  })
  
  // Time analysis
  const averagePerQuestion = Math.round(totalTimeSpent / questionResults.length)
  const efficiency = averagePerQuestion < 60 ? 'fast' : averagePerQuestion < 90 ? 'optimal' : 'slow'
  
  // Generate recommendations
  const recommendations = generateRecommendations(satScore, categoryStats, difficultyStats, efficiency)
  
  // Improvement areas
  const improvementAreas = Object.entries(categoryStats)
    .filter(([_, stats]) => stats.strength === 'weak')
    .map(([category, _]) => category)
    .slice(0, 3)
  
  // Target score (next milestone)
  const targetScore = getTargetScore(satScore.totalScore)
  
  return {
    satScore,
    categoryPerformance: categoryStats,
    difficultyAnalysis: difficultyStats,
    timeAnalysis: {
      totalTime: totalTimeSpent,
      averagePerQuestion,
      efficiency
    },
    recommendations,
    targetScore,
    improvementAreas
  }
}

function generateRecommendations(
  satScore: SATScore,
  categoryStats: Record<string, { correct: number; total: number; percentage: number; strength: 'strong' | 'average' | 'weak' }>,
  difficultyStats: { easy: { correct: number; total: number; percentage: number }; medium: { correct: number; total: number; percentage: number }; hard: { correct: number; total: number; percentage: number } },
  efficiency: string
): string[] {
  const recommendations: string[] = []
  
  // Score-based recommendations
  if (satScore.totalScore < 1000) {
    recommendations.push("Focus on mastering fundamental concepts in both Math and Reading & Writing")
  } else if (satScore.totalScore < 1200) {
    recommendations.push("Work on medium-difficulty questions to build consistency")
  } else if (satScore.totalScore < 1400) {
    recommendations.push("Practice challenging problems and advanced concepts")
  } else {
    recommendations.push("Maintain your strong performance with regular practice")
  }
  
  // Category-specific recommendations
  const weakCategories = Object.entries(categoryStats)
    .filter(([_, stats]) => stats.strength === 'weak')
    .map(([category, _]) => category)
  
  if (weakCategories.length > 0) {
    recommendations.push(`Focus additional study time on: ${weakCategories.join(', ')}`)
  }
  
  // Difficulty recommendations
  if (difficultyStats.easy.percentage < 90) {
    recommendations.push("Review fundamental concepts - you should aim for 90%+ on easy questions")
  }
  if (difficultyStats.hard.percentage < 30) {
    recommendations.push("Practice more challenging problems to improve on hard questions")
  }
  
  // Time management
  if (efficiency === 'slow') {
    recommendations.push("Work on time management - practice answering questions more quickly")
  } else if (efficiency === 'fast') {
    recommendations.push("Consider spending more time on difficult questions to improve accuracy")
  }
  
  return recommendations
}

function getTargetScore(currentScore: number): number {
  const milestones = [600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600]
  
  for (const milestone of milestones) {
    if (currentScore < milestone) {
      return milestone
    }
  }
  
  return 1600 // Already at top
}

export function getScoreLevel(score: number): { level: string; color: string; description: string } {
  if (score >= 1500) return { 
    level: 'Exceptional', 
    color: 'text-purple-600', 
    description: 'Top 1% - Ivy League competitive' 
  }
  if (score >= 1400) return { 
    level: 'Excellent', 
    color: 'text-green-600', 
    description: 'Top 5% - Highly competitive colleges' 
  }
  if (score >= 1300) return { 
    level: 'Very Good', 
    color: 'text-blue-600', 
    description: 'Top 15% - Good college options' 
  }
  if (score >= 1200) return { 
    level: 'Good', 
    color: 'text-teal-600', 
    description: 'Top 30% - Many college options' 
  }
  if (score >= 1000) return { 
    level: 'Average', 
    color: 'text-yellow-600', 
    description: 'Average range - Some college options' 
  }
  if (score >= 800) return { 
    level: 'Below Average', 
    color: 'text-orange-600', 
    description: 'Below average - Focus on improvement' 
  }
  
  return { 
    level: 'Needs Improvement', 
    color: 'text-red-600', 
    description: 'Significant improvement needed' 
  }
}
