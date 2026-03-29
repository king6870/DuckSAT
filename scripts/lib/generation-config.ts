/**
 * Generation Configuration for QG800
 * 
 * Target: 371 questions (41 reading + 330 math)
 * From: 430 current → 800 target (400 reading + 400 math)
 * 
 * @see docs/prd/PRD-question-generation-800.md
 * @see docs/specs/SPEC-QG800.md
 */

import { TopicConfig, DifficultyDistribution, AzureOpenAIConfig } from './generation-types';

/**
 * Difficulty Distribution (same for all topics)
 * Per batch of 20: 6 easy, 10 medium, 4 hard
 */
export const DIFFICULTY_DISTRIBUTION: DifficultyDistribution = {
  easy: 0.30,    // 30%
  medium: 0.50,  // 50%
  hard: 0.20,    // 20%
};

/**
 * Difficulty to Score Mapping
 */
export const DIFFICULTY_SCORES: Record<string, number> = {
  easy: 25,
  medium: 50,
  hard: 75,
};

/**
 * Time Estimates (seconds)
 */
export const TIME_ESTIMATES: Record<string, number> = {
  math: 120,            // 2 minutes
  'reading-writing': 90, // 1.5 minutes
};

/**
 * Generation Plan - Math Topics
 */
export const MATH_TOPICS: TopicConfig[] = [
  {
    id: 'algebra',
    moduleType: 'math',
    category: 'algebra',
    subtopics: ['linear-equations', 'inequalities', 'systems', 'polynomials', 'absolute-value'],
    target: 80,
    difficulty: DIFFICULTY_DISTRIBUTION,
    batchSize: 20,
  },
  {
    id: 'geometry',
    moduleType: 'math',
    category: 'geometry',
    subtopics: ['triangles', 'circles', 'coordinate-geometry', 'area-perimeter', 'angles', 'transformations'],
    target: 70,
    difficulty: DIFFICULTY_DISTRIBUTION,
    batchSize: 20,
  },
  {
    id: 'statistics',
    moduleType: 'math',
    category: 'problem-solving-data-analysis',
    subtopics: ['mean-median-mode', 'probability', 'scatter-plots', 'trends', 'standard-deviation'],
    target: 60,
    difficulty: DIFFICULTY_DISTRIBUTION,
    batchSize: 20,
  },
  {
    id: 'quadratic',
    moduleType: 'math',
    category: 'advanced-math',
    subtopics: ['factoring', 'completing-square', 'quadratic-formula', 'vertex-form'],
    target: 40,
    difficulty: DIFFICULTY_DISTRIBUTION,
    batchSize: 20,
  },
  {
    id: 'linear-functions',
    moduleType: 'math',
    category: 'algebra',
    subtopics: ['slope-intercept', 'point-slope', 'parallel-perpendicular', 'graphing'],
    target: 40,
    difficulty: DIFFICULTY_DISTRIBUTION,
    batchSize: 20,
  },
  {
    id: 'advanced-math',
    moduleType: 'math',
    category: 'advanced-math',
    subtopics: ['exponentials', 'logarithms', 'rational-expressions', 'complex-numbers'],
    target: 40,
    difficulty: DIFFICULTY_DISTRIBUTION,
    batchSize: 20,
  },
];

/**
 * Generation Plan - Reading Topics
 */
export const READING_TOPICS: TopicConfig[] = [
  {
    id: 'reading-comp',
    moduleType: 'reading-writing',
    category: 'reading-comprehension',
    subtopics: ['main-idea', 'inference', 'detail', 'purpose'],
    target: 20,
    difficulty: DIFFICULTY_DISTRIBUTION,
    batchSize: 20,
  },
  {
    id: 'vocabulary',
    moduleType: 'reading-writing',
    category: 'vocabulary',
    subtopics: ['context-clues', 'word-meaning', 'synonyms'],
    target: 10,
    difficulty: DIFFICULTY_DISTRIBUTION,
    batchSize: 10,
  },
  {
    id: 'rhetoric',
    moduleType: 'reading-writing',
    category: 'writing-language',
    subtopics: ['author-purpose', 'tone', 'sentence-function'],
    target: 6,
    difficulty: DIFFICULTY_DISTRIBUTION,
    batchSize: 6,
  },
  {
    id: 'synthesis',
    moduleType: 'reading-writing',
    category: 'writing-language',
    subtopics: ['compare-contrast', 'integrate-information'],
    target: 5,
    difficulty: DIFFICULTY_DISTRIBUTION,
    batchSize: 5,
  },
  {
    id: 'grammar',
    moduleType: 'reading-writing',
    category: 'grammar',
    subtopics: ['subject-verb-agreement', 'pronoun-clarity', 'punctuation', 'sentence-structure', 'verb-tense'],
    target: 60,
    difficulty: DIFFICULTY_DISTRIBUTION,
    batchSize: 20,
  },
];

/**
 * All Topics Combined
 */
export const ALL_TOPICS = [...MATH_TOPICS, ...READING_TOPICS];

/**
 * Extract base endpoint from full URL if needed
 */
function getBaseEndpoint(): string {
  const fullUrl = process.env.ENDPOINT_URL || '';
  if (fullUrl.includes('/openai/deployments')) {
    // Extract base URL: https://ducksat.cognitiveservices.azure.com
    const match = fullUrl.match(/(https?:\/\/[^\/]+)/);
    return match ? match[1] : fullUrl;
  }
  return fullUrl;
}

/**
 * Azure OpenAI Configuration
 */
export const AZURE_OPENAI_CONFIG: AzureOpenAIConfig = {
  apiKey: process.env.AZURE_OPENAI_API_KEY || '',
  endpoint: getBaseEndpoint(),
  deployment: process.env.DEPLOYMENT_NAME || 'gpt-5-nano',
  apiVersion: process.env.API_VERSION || '2024-12-01-preview',
  temperature: 0.8,
  maxTokens: 32000,  // Significantly increased for reasoning model (gpt-5-nano uses extensive tokens for internal reasoning + output)
  topP: 0.95,
  frequencyPenalty: 0.3,
  presencePenalty: 0.1,
  questionsPerCall: 1,        // Reduced to 1 (from 2) - reasoning model exhausts tokens even with minimal output
  delayBetweenCalls: 1000,    // 1 second delay between calls
  maxRetries: 3,
  retryDelay: 5000,            // 5 seconds
};

/**
 * File Paths
 */
export const PATHS = {
  generatedBatches: 'generated-batches',
  approved: 'generated-batches/approved',
  rejected: 'generated-batches/rejected',
  stateFile: 'generated-batches/generation-state.json',
  rejectedLog: 'generated-batches/rejected/rejected-log.json',
  htmlExport: 'output/html',
};

/**
 * Prompt Version (for tracking)
 */
export const PROMPT_VERSION = 'v1.0';

/**
 * Source Tag (for DB import)
 */
export const SOURCE_TAG = 'SAT Generator QG800';

/**
 * Review Status
 */
export const REVIEW_STATUS = 'approved';

/**
 * Totals for Validation
 */
export const TOTALS = {
  targetReading: 400,
  targetMath: 400,
  targetTotal: 800,
  generateReading: 41,
  generateMath: 330,
  generateTotal: 371,
};
