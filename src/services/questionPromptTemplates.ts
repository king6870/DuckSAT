/**
 * Question Prompt Templates for AI Generation
 * 
 * This file contains all prompt builder functions for generating SAT questions.
 * All prompt wording, formatting, and clarity improvements are centralized here.
 */

import {
  PASSAGE_LIMITS,
  QUESTION_COUNTS,
  CHART_REQUIREMENTS,
  MATH_NOTATION_RULES,
  JSON_OUTPUT_INSTRUCTIONS,
} from './promptConfig'

/**
 * Interface for subtopic information
 */
interface SubtopicInfo {
  id?: string
  name: string
  topicName?: string
  description?: string
  targetQuestions?: number
  difficultyDistribution?: {
    easy: number
    medium: number
    hard: number
  }
  moduleType?: 'math' | 'reading-writing'
}

/**
 * Settings for customizable question generation
 */
interface GenerationSettings {
  includeCharts?: boolean
  includePassages?: boolean
  mathCount?: number
  readingCount?: number
}

/**
 * Build the prompt for generating math questions
 * 
 * @param subtopics - Array of subtopics to generate questions for
 * @param settings - Optional generation settings
 * @returns Complete prompt string for math question generation
 */
export function buildMathQuestionsPrompt(
  subtopics: SubtopicInfo[],
  settings?: GenerationSettings
): string {
  const count = settings?.mathCount || QUESTION_COUNTS.DEFAULT_MATH
  const includeCharts = settings?.includeCharts !== false // Default to true

  const includeChartsText = includeCharts
    ? 'MUST include detailed visual elements: graphs, charts, tables, diagrams, or coordinate planes'
    : 'May optionally include visual elements if they enhance understanding'

  const subtopicsList = subtopics
    .map((s, i) => `${i + 1}. ${s.name}${s.topicName ? ` (${s.topicName})` : ''}`)
    .join('\n')

  const visualRequirementsList = CHART_REQUIREMENTS.TYPES
    .map((type) => `- ${type}`)
    .join('\n')

  const chartDescriptionDetails = CHART_REQUIREMENTS.CHART_DESCRIPTION_DETAILS
    .map((detail) => `- ${detail}`)
    .join('\n')

  const chartExamples = CHART_REQUIREMENTS.GOOD_EXAMPLES
    .map((example) => `- "${example}"`)
    .join('\n')

  const mathNotationGuidelines = [
    `- For equations: ${MATH_NOTATION_RULES.EQUATIONS}`,
    `- For fractions: ${MATH_NOTATION_RULES.FRACTIONS}`,
    `- For exponents: ${MATH_NOTATION_RULES.EXPONENTS}`,
    `- For square roots: ${MATH_NOTATION_RULES.SQUARE_ROOTS}`,
    `- For coordinates: ${MATH_NOTATION_RULES.COORDINATES}`,
    `- For inequalities: ${MATH_NOTATION_RULES.INEQUALITIES}`,
    `- For functions: ${MATH_NOTATION_RULES.FUNCTIONS}`,
    ...MATH_NOTATION_RULES.GUIDELINES.map((g) => `- ${g}`),
  ].join('\n')

  const exampleSubtopic = subtopics[0]?.name || 'Math'
  const exampleCategory = subtopics[0]?.topicName || 'Math'
  const exampleSubtopic2 = subtopics[1]?.name || 'Math'
  const exampleCategory2 = subtopics[1]?.topicName || 'Math'

  return `
Generate exactly ${count} high-quality SAT Math questions, one for each of these subtopics:
${subtopicsList}

Requirements for each question:
- ${includeChartsText}
- For coordinate geometry: specify exact points, lines, curves, and grid details
- For functions: include function graphs with labeled axes, intercepts, and key points
- For geometry: provide detailed diagrams with measurements, angles, and labeled vertices
- For statistics: include data tables, bar charts, histograms, or scatter plots with specific values
- For algebra: show coordinate planes, number lines, or visual representations of equations
- 4 multiple choice options (A, B, C, D)
- Clear correct answer with step-by-step explanation
- Points value (1-4 points based on complexity)
- Appropriate for SAT Math section
- Vary complexity across the ${count} questions
- Make graphs interactive when possible (e.g., "Click to identify the vertex", "Select the correct point")

VISUAL REQUIREMENTS - Every question MUST have one of these${includeCharts ? '' : ' (if charts are included)'}:
${visualRequirementsList}

IMPORTANT MATH NOTATION REQUIREMENTS:
${mathNotationGuidelines}

IMPORTANT: For the chartDescription field, be very specific about:
${chartDescriptionDetails}

EXAMPLES of good chartDescription content:
${chartExamples}

${JSON_OUTPUT_INSTRUCTIONS.PREFIX} Use this exact format:

[
  {
    "question": "The coordinate plane shows the graph of f(x) = x^2 - 4x + 3. What are the coordinates of the vertex?",
    "options": ["A) (2, -1)", "B) (2, 1)", "C) (-2, -1)", "D) (4, 3)"],
    "correctAnswer": 0,
    "points": 3,
    "explanation": "For f(x) = x^2 - 4x + 3, vertex x-coordinate = -b/(2a) = -(-4)/(2(1)) = 2. f(2) = (2)^2 - 4(2) + 3 = 4 - 8 + 3 = -1. Vertex is (2, -1)",
    "subtopic": "${exampleSubtopic}",
    "category": "${exampleCategory}",
    "hasChart": ${includeCharts},
    "chartDescription": "Coordinate plane from -1 to 5 on x-axis and -3 to 7 on y-axis. Shows parabola f(x) = x^2 - 4x + 3 with vertex at (2, -1), y-intercept at (0, 3), and x-intercepts at (1, 0) and (3, 0). Grid lines every 1 unit.",
    "interactionType": "point-selection",
    "graphType": "coordinate-plane"
  },
  {
    "question": "The bar chart shows test scores for a math class. What is the median score?",
    "options": ["A) 75", "B) 80", "C) 85", "D) 90"],
    "correctAnswer": 1,
    "points": 2,
    "explanation": "From the chart: 70-79 (3 students), 80-89 (7 students), 90-99 (5 students). Total 15 students. Median is 8th value, which falls in 80-89 range, so median ≈ 80",
    "subtopic": "${exampleSubtopic2}",
    "category": "${exampleCategory2}",
    "hasChart": ${includeCharts},
    "chartDescription": "Bar chart with x-axis showing score ranges (70-79, 80-89, 90-99) and y-axis showing number of students. Bars: 70-79 (3), 80-89 (7), 90-99 (5). Blue bars with clear labels.",
    "interactionType": "data-analysis",
    "graphType": "bar-chart"
  }
]

Generate all ${count} questions following this pattern. Ensure each question uses proper mathematical notation and includes step-by-step explanations with clear mathematical reasoning. ${JSON_OUTPUT_INSTRUCTIONS.REMINDER}
`
}

/**
 * Build the prompt for generating reading questions
 * 
 * @param subtopics - Array of subtopics to generate questions for
 * @param settings - Optional generation settings
 * @returns Complete prompt string for reading question generation
 */
export function buildReadingQuestionsPrompt(
  subtopics: SubtopicInfo[],
  settings?: GenerationSettings
): string {
  const count = settings?.readingCount || QUESTION_COUNTS.DEFAULT_READING
  const includePassages = settings?.includePassages !== false // Default to true

  const includePassagesText = includePassages
    ? `Include a reading passage (${PASSAGE_LIMITS.MIN_WORDS}-${PASSAGE_LIMITS.MAX_WORDS} words)`
    : 'May optionally include shorter passages if they enhance understanding'

  const subtopicsList = subtopics
    .map((s, i) => `${i + 1}. ${s.name}${s.topicName ? ` (${s.topicName})` : ''}`)
    .join('\n')

  const exampleSubtopic = subtopics[0]?.name || 'Reading'
  const exampleCategory = subtopics[0]?.topicName || 'Reading'
  const exampleSubtopic2 = subtopics[1]?.name || 'Reading'
  const exampleCategory2 = subtopics[1]?.topicName || 'Reading'

  return `
Generate exactly ${count} high-quality SAT Reading questions, one for each of these subtopics:
${subtopicsList}

Requirements for each question:
- ${includePassagesText}
- 4 multiple choice options (A, B, C, D)
- Clear correct answer with explanation
- Points value (1-3 points based on complexity)
- Appropriate for SAT Reading section
- Vary passage types and complexity

${JSON_OUTPUT_INSTRUCTIONS.PREFIX} Use this exact format:

[
  {
    "question": "Question text here",
    "passage": "Reading passage text here (${PASSAGE_LIMITS.MIN_WORDS}-${PASSAGE_LIMITS.MAX_WORDS} words)...",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": 0,
    "points": 2,
    "explanation": "Detailed explanation of the correct answer",
    "subtopic": "${exampleSubtopic}",
    "category": "${exampleCategory}"
  },
  {
    "question": "Second question text here",
    "passage": "Second reading passage text here (${PASSAGE_LIMITS.MIN_WORDS}-${PASSAGE_LIMITS.MAX_WORDS} words)...",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": 1,
    "points": 2,
    "explanation": "Detailed explanation of the correct answer",
    "subtopic": "${exampleSubtopic2}",
    "category": "${exampleCategory2}"
  }
]

Generate all ${count} questions following this pattern. ${JSON_OUTPUT_INSTRUCTIONS.REMINDER}
`
}

/**
 * Build the prompt for generating math questions for a specific subtopic
 * 
 * @param subtopic - The specific subtopic to generate questions for
 * @param count - Number of questions to generate
 * @returns Complete prompt string for subtopic-specific math question generation
 */
export function buildMathSubtopicPrompt(
  subtopic: SubtopicInfo,
  count: number
): string {
  const difficultyDistribution = subtopic.difficultyDistribution || {
    easy: 35,
    medium: 45,
    hard: 20,
  }

  const easyCount = Math.round((count * difficultyDistribution.easy) / 100)
  const mediumCount = Math.round((count * difficultyDistribution.medium) / 100)
  const hardCount = count - easyCount - mediumCount

  return `Generate ${count} high-quality SAT Math questions for the subtopic "${subtopic.name}".

Description: ${subtopic.description || 'SAT Math subtopic'}

Difficulty Distribution:
- Easy: ${easyCount} questions (${difficultyDistribution.easy}%)
- Medium: ${mediumCount} questions (${difficultyDistribution.medium}%)  
- Hard: ${hardCount} questions (${difficultyDistribution.hard}%)

Requirements:
1. All questions must be authentic SAT-style math problems
2. Include charts/graphs where appropriate for visual learning
3. Provide detailed explanations for correct answers
4. Use realistic SAT point values (1-4 points based on difficulty)
5. Follow official SAT math question formats

Return ONLY a valid JSON array with this exact format:
[
  {
    "question": "Question text here",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": 0,
    "points": 2,
    "explanation": "Detailed step-by-step explanation",
    "hasChart": true,
    "chartDescription": "Description of chart/graph if applicable",
    "graphType": "coordinate-plane",
    "interactionType": "point-placement"
  }
]`
}

/**
 * Build the prompt for generating reading questions for a specific subtopic
 * 
 * @param subtopic - The specific subtopic to generate questions for
 * @param count - Number of questions to generate
 * @returns Complete prompt string for subtopic-specific reading question generation
 */
export function buildReadingSubtopicPrompt(
  subtopic: SubtopicInfo,
  count: number
): string {
  const difficultyDistribution = subtopic.difficultyDistribution || {
    easy: 35,
    medium: 45,
    hard: 20,
  }

  const easyCount = Math.round((count * difficultyDistribution.easy) / 100)
  const mediumCount = Math.round((count * difficultyDistribution.medium) / 100)
  const hardCount = count - easyCount - mediumCount

  return `Generate ${count} high-quality SAT Reading & Writing questions for the subtopic "${subtopic.name}".

Description: ${subtopic.description || 'SAT Reading & Writing subtopic'}

Difficulty Distribution:
- Easy: ${easyCount} questions (${difficultyDistribution.easy}%)
- Medium: ${mediumCount} questions (${difficultyDistribution.medium}%)
- Hard: ${hardCount} questions (${difficultyDistribution.hard}%)

Requirements:
1. All questions must be authentic SAT-style reading/writing problems
2. Include appropriate passages (${PASSAGE_LIMITS.LONGER_MIN_WORDS}-${PASSAGE_LIMITS.LONGER_MAX_WORDS} words) when needed
3. Cover diverse topics: literature, science, history, social studies
4. Provide detailed explanations for correct answers
5. Use realistic SAT point values (1-3 points based on difficulty)

Return ONLY a valid JSON array with this exact format:
[
  {
    "question": "Question text here",
    "passage": "Reading passage text (if applicable)",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": 1,
    "points": 2,
    "explanation": "Detailed explanation of correct answer"
  }
]`
}

/**
 * Build the evaluation prompt for assessing question quality
 * 
 * @param question - The question to evaluate
 * @returns Complete prompt string for question evaluation
 */
export function buildEvaluationPrompt(question: {
  question: string
  passage?: string
  chartDescription?: string
  options: string[]
  correctAnswer: number
  explanation: string
  subtopic: string
  points: number
}): string {
  return `
Evaluate this SAT question for difficulty and quality:

Question: ${question.question}
${question.passage ? `Passage: ${question.passage}` : ''}
${question.chartDescription ? `Chart: ${question.chartDescription}` : ''}
Options: ${question.options.join(', ')}
Correct Answer: ${question.options[question.correctAnswer]}
Explanation: ${question.explanation}
Subtopic: ${question.subtopic}
Points: ${question.points}

Please evaluate:
1. Difficulty level (easy/medium/hard) based on SAT standards
2. Quality score (0-1) for accuracy, clarity, and appropriateness
3. Whether to accept this question (true/false) - reject if too easy or too hard for SAT
4. Brief feedback on the question

Respond in this JSON format:
{
  "difficulty": "medium",
  "qualityScore": 0.85,
  "isAccepted": true,
  "evaluationFeedback": "Well-constructed question with appropriate difficulty for SAT standards."
}
`
}
