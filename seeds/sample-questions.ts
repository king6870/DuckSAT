/**
 * Sample Questions for Testing Question Review Page
 * 
 * This file contains sample questions with diagrams to test the question-review page.
 * These questions include both diagramSvg (for compatibility) and imageUrl fields
 * to ensure diagrams render correctly in the non-admin question-review UI.
 * 
 * Key features:
 * - imageUrl fields point to assets in /assets/diagrams
 * - reviewStatus set to 'pending'
 * - createdBy set to 'seed'
 * - Corrected numeric answers
 * 
 * Usage:
 * Import this array in seed scripts or directly in tests to populate sample questions
 * with working diagram references.
 */

export interface SampleQuestion {
  subtopicId?: string | null;
  moduleType: string;
  difficulty: string;
  category: string;
  subtopic: string;
  question: string;
  passage: string | null;
  options: string[];
  correctAnswer: number;
  explanation: string;
  wrongAnswerExplanations?: Record<string, string>;
  imageUrl?: string | null;
  imageAlt?: string | null;
  chartData?: Record<string, unknown> | null;
  diagramSvg?: string | null;
  timeEstimate: number;
  source: string;
  tags: string[];
  isActive: boolean;
  reviewStatus?: string;
  createdBy?: string;
}

export const sampleQuestions: SampleQuestion[] = [
  // Math Question 1: Geometry with Triangle Diagram
  {
    subtopicId: null,
    moduleType: 'math',
    difficulty: 'medium',
    category: 'geometry',
    subtopic: 'triangles',
    question: 'In the triangle shown, if angle A is 45° and angle B is 60°, what is the measure of angle C?',
    passage: null,
    options: ['45°', '60°', '75°', '90°'],
    correctAnswer: 2,
    explanation: 'The sum of angles in a triangle is always 180°. Therefore, angle C = 180° - 45° - 60° = 75°.',
    wrongAnswerExplanations: {
      '0': 'This would only be correct if angle B was also 90°, but angle B is 60°.',
      '1': 'This is the measure of angle B, not angle C.',
      '3': 'This would require the sum of angles A and B to be 90°, but they sum to 105°.',
    },
    imageUrl: '/assets/diagrams/sample_triangle.svg',
    imageAlt: 'Triangle with angles A=45°, B=60°, and C unlabeled',
    chartData: null,
    diagramSvg: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="250" viewBox="0 0 300 250" role="img" aria-label="Triangle diagram"><title>Triangle with labeled angles</title><desc>A triangle showing angle A at 45 degrees, angle B at 60 degrees, and angle C to be determined</desc><polygon points="150,30 50,200 250,200" fill="none" stroke="#2563eb" stroke-width="2"/><text x="150" y="25" text-anchor="middle" font-size="16" fill="#1e40af">A (45°)</text><text x="35" y="205" text-anchor="middle" font-size="16" fill="#1e40af">B (60°)</text><text x="265" y="205" text-anchor="middle" font-size="16" fill="#1e40af">C (?)</text><circle cx="150" cy="30" r="3" fill="#2563eb"/><circle cx="50" cy="200" r="3" fill="#2563eb"/><circle cx="250" cy="200" r="3" fill="#2563eb"/></svg>',
    timeEstimate: 90,
    source: 'SAT Practice',
    tags: ['geometry', 'triangles', 'angles'],
    isActive: true,
    reviewStatus: 'pending',
    createdBy: 'seed',
  },

  // Math Question 2: Algebra with Linear Models Diagram
  {
    subtopicId: null,
    moduleType: 'math',
    difficulty: 'medium',
    category: 'algebra',
    subtopic: 'linear-models',
    question: 'The graph shows the relationship between hours studied and test scores. Based on the linear model, what test score would you predict for a student who studies for 6 hours?',
    passage: null,
    options: ['75', '80', '85', '90'],
    correctAnswer: 2,
    explanation: 'The linear model shows that for every hour studied, the test score increases by approximately 5 points. Starting from a base of about 55 points at 0 hours, after 6 hours: 55 + (6 × 5) = 85 points.',
    wrongAnswerExplanations: {
      '0': 'This score is too low. The trend line shows scores increase more significantly with study time.',
      '1': 'This is close, but the linear model predicts a slightly higher score based on the rate of increase.',
      '3': 'This score is too high. While the trend is positive, it doesn\'t increase this rapidly.',
    },
    imageUrl: '/assets/diagrams/sample_lines.svg',
    imageAlt: 'Scatter plot showing linear relationship between hours studied (x-axis) and test scores (y-axis)',
    chartData: null,
    diagramSvg: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" role="img" aria-label="Linear model graph"><title>Study Hours vs Test Scores</title><desc>A scatter plot showing a positive linear relationship between hours studied and test scores</desc><line x1="50" y1="250" x2="350" y2="250" stroke="#374151" stroke-width="2"/><line x1="50" y1="250" x2="50" y2="30" stroke="#374151" stroke-width="2"/><text x="200" y="285" text-anchor="middle" font-size="14" fill="#1f2937">Hours Studied</text><text x="20" y="140" text-anchor="middle" font-size="14" fill="#1f2937" transform="rotate(-90 20 140)">Test Score</text><circle cx="80" cy="220" r="4" fill="#2563eb"/><circle cx="110" cy="205" r="4" fill="#2563eb"/><circle cx="140" cy="185" r="4" fill="#2563eb"/><circle cx="170" cy="170" r="4" fill="#2563eb"/><circle cx="200" cy="150" r="4" fill="#2563eb"/><circle cx="230" cy="135" r="4" fill="#2563eb"/><circle cx="260" cy="115" r="4" fill="#2563eb"/><circle cx="290" cy="100" r="4" fill="#2563eb"/><line x1="70" y1="230" x2="300" y2="90" stroke="#ef4444" stroke-width="2" stroke-dasharray="5,5"/><text x="60" y="265" text-anchor="middle" font-size="12" fill="#6b7280">0</text><text x="110" y="265" text-anchor="middle" font-size="12" fill="#6b7280">2</text><text x="170" y="265" text-anchor="middle" font-size="12" fill="#6b7280">4</text><text x="230" y="265" text-anchor="middle" font-size="12" fill="#6b7280">6</text><text x="290" y="265" text-anchor="middle" font-size="12" fill="#6b7280">8</text><text x="40" y="255" text-anchor="end" font-size="12" fill="#6b7280">50</text><text x="40" y="205" text-anchor="end" font-size="12" fill="#6b7280">60</text><text x="40" y="155" text-anchor="end" font-size="12" fill="#6b7280">70</text><text x="40" y="105" text-anchor="end" font-size="12" fill="#6b7280">80</text><text x="40" y="55" text-anchor="end" font-size="12" fill="#6b7280">90</text></svg>',
    timeEstimate: 120,
    source: 'SAT Practice',
    tags: ['algebra', 'linear-models', 'data-analysis'],
    isActive: true,
    reviewStatus: 'pending',
    createdBy: 'seed',
  },

  // Math Question 3: Simple Algebra (no diagram)
  {
    subtopicId: null,
    moduleType: 'math',
    difficulty: 'easy',
    category: 'algebra',
    subtopic: 'linear-equations',
    question: 'If 3x + 7 = 22, what is the value of x?',
    passage: null,
    options: ['5', '7', '15', '29'],
    correctAnswer: 0,
    explanation: 'To solve for x, subtract 7 from both sides: 3x = 15. Then divide both sides by 3: x = 5.',
    wrongAnswerExplanations: {
      '1': 'This is the constant term in the equation, not the value of x.',
      '2': 'This is 3x, not x. Remember to divide by 3 after isolating the variable term.',
      '3': 'This is the result of adding 7 to 22 instead of subtracting.',
    },
    imageUrl: null,
    imageAlt: null,
    chartData: null,
    timeEstimate: 60,
    source: 'SAT Practice',
    tags: ['algebra', 'linear-equations'],
    isActive: true,
    reviewStatus: 'pending',
    createdBy: 'seed',
  },

  // Reading-Writing Question: Main Ideas (no diagram)
  {
    subtopicId: null,
    moduleType: 'reading-writing',
    difficulty: 'medium',
    category: 'reading-comprehension',
    subtopic: 'main-ideas',
    question: 'Which choice best states the main purpose of the text?',
    passage: 'The honey bee is essential to modern agriculture. These remarkable insects pollinate approximately one-third of the crops we eat, including fruits, vegetables, and nuts. Without honey bees, our food supply would be drastically reduced. Recent declines in bee populations have alarmed scientists and farmers alike, prompting increased research into protecting these vital pollinators.',
    options: [
      'To describe the physical characteristics of honey bees',
      'To explain the importance of honey bees to agriculture',
      'To discuss how honey bees produce honey',
      'To compare honey bees with other types of bees'
    ],
    correctAnswer: 1,
    explanation: 'The passage focuses on how honey bees are essential to agriculture by pollinating crops and the concerns about declining populations. Option B directly captures this main purpose.',
    wrongAnswerExplanations: {
      '0': 'The passage doesn\'t describe physical characteristics of honey bees.',
      '2': 'Honey production is not mentioned in the passage.',
      '3': 'The passage doesn\'t compare honey bees with other types of bees.',
    },
    imageUrl: null,
    imageAlt: null,
    chartData: null,
    timeEstimate: 75,
    source: 'SAT Practice',
    tags: ['reading-comprehension', 'main-ideas'],
    isActive: true,
    reviewStatus: 'pending',
    createdBy: 'seed',
  },
];
