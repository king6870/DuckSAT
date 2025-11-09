/**
 * Prompt Configuration for AI Question Generation
 * 
 * This file contains all configuration parameters for AI question generation
 * including difficulty distributions, passage limits, and chart instructions.
 * Admins/maintainers can easily update these values to tune question generation.
 */

/**
 * Default temperature and token settings for LLM API calls
 */
export const LLM_SETTINGS = {
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 4000,
  EVALUATION_TEMPERATURE: 0.1,
  EVALUATION_MAX_TOKENS: 200,
} as const

/**
 * Reading passage word count limits
 */
export const PASSAGE_LIMITS = {
  MIN_WORDS: 150,
  MAX_WORDS: 300,
  LONGER_MIN_WORDS: 150,
  LONGER_MAX_WORDS: 400,
} as const

/**
 * Default difficulty distributions for question generation
 * Values are percentages that should sum to 100
 */
export const DIFFICULTY_DISTRIBUTION = {
  EASY: 35,
  MEDIUM: 45,
  HARD: 20,
} as const

/**
 * Question count defaults for batch generation
 */
export const QUESTION_COUNTS = {
  DEFAULT_MATH: 5,
  DEFAULT_READING: 5,
  TARGET_PER_SUBTOPIC: 100,
  BATCH_SIZE: 5,
} as const

/**
 * Points assignment by difficulty level
 */
export const POINTS_BY_DIFFICULTY = {
  EASY: { MIN: 1, MAX: 2 },
  MEDIUM: { MIN: 2, MAX: 3 },
  HARD: { MIN: 3, MAX: 4 },
} as const

/**
 * Chart/Graph visualization requirements and examples
 */
export const CHART_REQUIREMENTS = {
  TYPES: [
    'Coordinate plane with plotted points/lines/curves',
    'Data table with numerical values',
    'Bar chart, histogram, or pie chart',
    'Geometric diagram with labeled measurements',
    'Function graph with domain/range marked',
    'Number line with inequalities or intervals',
    'Scatter plot with trend lines',
    'Box plot or other statistical visualization',
  ],
  COORDINATE_GEOMETRY_SPECS: [
    'specify exact points, lines, curves, and grid details',
  ],
  FUNCTION_SPECS: [
    'include function graphs with labeled axes, intercepts, and key points',
  ],
  GEOMETRY_SPECS: [
    'provide detailed diagrams with measurements, angles, and labeled vertices',
  ],
  STATISTICS_SPECS: [
    'include data tables, bar charts, histograms, or scatter plots with specific values',
  ],
  ALGEBRA_SPECS: [
    'show coordinate planes, number lines, or visual representations of equations',
  ],
  CHART_DESCRIPTION_DETAILS: [
    'Coordinate points to plot: (x, y) coordinates with exact values',
    'Function equations: y = mx + b, y = ax^2 + bx + c, etc.',
    'Table data: specific numbers, headers, and formatting',
    'Chart details: axis labels, scales, data points, colors',
    'Geometric shapes: triangles with vertices at specific points, angles, side lengths',
    'Interactive elements: what the student should click, drag, or manipulate',
    'Axes ranges and labels with specific numerical values',
    'Grid settings and scale increments',
  ],
  GOOD_EXAMPLES: [
    'Data table showing x values: -2, -1, 0, 1, 2 and corresponding y values: 4, 1, 0, 1, 4 for function f(x) = x^2',
    'Coordinate plane from -10 to 10 on both axes. Plot parabola y = (x-3)^2 - 4 with vertex at (3, -4) and y-intercept at (0, 5). Grid lines every 1 unit.',
    'Bar chart showing test scores: 70-79 (5 students), 80-89 (12 students), 90-99 (8 students). Y-axis shows frequency, X-axis shows score ranges.',
  ],
} as const

/**
 * Mathematical notation formatting guidelines
 */
export const MATH_NOTATION_RULES = {
  EQUATIONS: 'Use format like "y = 2x + 3", "f(x) = x^2 - 4x + 1", "2x^2 + 3x - 5 = 0"',
  FRACTIONS: 'Use "1/2", "3/4", "-2/3" format',
  EXPONENTS: 'Use "x^2", "2^n", "(x+1)^3" format',
  SQUARE_ROOTS: 'Use "sqrt(x)", "sqrt(25)", "sqrt(x^2 + 1)" format',
  COORDINATES: 'Use "(2, 3)", "(-1, 4)", "(0, -2)" format',
  INEQUALITIES: 'Use "x > 5", "y <= 3", "2x + 1 >= 7" format',
  FUNCTIONS: 'Use "f(x) = ", "g(t) = ", "h(n) = " format',
  GUIDELINES: [
    'Use proper mathematical notation in questions, options, and explanations',
    'Include mathematical expressions in both questions and answer choices',
    'Make explanations step-by-step with clear mathematical reasoning',
  ],
} as const

/**
 * Quality assessment thresholds
 */
export const QUALITY_THRESHOLDS = {
  MIN_EXPLANATION_LENGTH: 50,
  REQUIRED_OPTIONS_COUNT: 4,
  MIN_QUESTION_LENGTH: 20,
  MIN_PASSAGE_LENGTH: 100,
  BASE_QUALITY_SCORE: 0.7,
  GOOD_QUALITY_SCORE: 0.8,
  ACCEPTANCE_THRESHOLD: 0.6,
} as const

/**
 * Image generation settings
 */
export const IMAGE_SETTINGS = {
  DEFAULT_WIDTH: 600,
  DEFAULT_HEIGHT: 400,
} as const

/**
 * Evaluation settings for fallback evaluation
 */
export const EVALUATION_CRITERIA = {
  EASY_MAX_POINTS: 1,
  HARD_MIN_POINTS: 3,
  QUALITY_BOOST_CHART: 0.1,
  QUALITY_BOOST_PASSAGE: 0.1,
  MAX_QUALITY_SCORE: 1.0,
} as const

/**
 * System roles for different AI tasks
 */
export const SYSTEM_ROLES = {
  QUESTION_GENERATOR: 'You are an expert SAT question writer. Generate high-quality, accurate SAT questions that match official SAT standards and difficulty levels. Always return valid JSON without any markdown formatting or code blocks.',
  EVALUATOR: 'You are an expert SAT evaluator. Return only valid JSON.',
} as const

/**
 * JSON output instructions (used across all prompts)
 */
export const JSON_OUTPUT_INSTRUCTIONS = {
  PREFIX: 'IMPORTANT: Return ONLY a valid JSON array with no additional text, markdown, or code blocks.',
  REMINDER: 'Return only the JSON array.',
} as const
