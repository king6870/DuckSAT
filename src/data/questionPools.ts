import { Question, QuestionPool } from '@/types/test'

// Reading and Writing Questions - Module 1
const readingWritingModule1: Question[] = [
  {
    id: 'rw1-1',
    moduleType: 'reading-writing',
    difficulty: 'medium',
    category: 'reading-comprehension',
    question: 'Based on the passage, the author\'s primary purpose is to:',
    passage: 'Climate change represents one of the most pressing challenges of our time. Scientists worldwide have reached a consensus that human activities, particularly the burning of fossil fuels, are the primary drivers of recent global warming. The evidence is overwhelming: rising global temperatures, melting ice caps, and increasingly frequent extreme weather events all point to the urgent need for action.',
    options: [
      'Criticize scientists for their research methods',
      'Explain the scientific consensus on climate change',
      'Argue against taking action on climate change',
      'Compare different types of fossil fuels'
    ],
    correctAnswer: 1,
    explanation: 'The passage focuses on explaining that scientists have reached consensus about human-caused climate change and presents evidence supporting this view.',
    timeEstimate: 90
  },
  {
    id: 'rw1-2',
    moduleType: 'reading-writing',
    difficulty: 'easy',
    category: 'grammar',
    question: 'Which choice provides the most effective transition between the two sentences?',
    options: [
      'However, this approach has limitations.',
      'In addition, scientists have discovered',
      'Therefore, the results were surprising.',
      'Meanwhile, other researchers disagree.'
    ],
    correctAnswer: 0,
    explanation: 'The word "However" creates an effective contrast that transitions between opposing ideas in the context.',
    timeEstimate: 60
  },
  {
    id: 'rw1-3',
    moduleType: 'reading-writing',
    difficulty: 'medium',
    category: 'vocabulary',
    question: 'The word "meticulous" in line 15 most nearly means:',
    options: ['Careless', 'Detailed', 'Quick', 'Expensive'],
    correctAnswer: 1,
    explanation: 'Meticulous means showing great attention to detail; being very careful and precise.',
    timeEstimate: 45
  },
  // Add more questions to reach 27 total
  ...Array.from({ length: 24 }, (_, i) => ({
    id: `rw1-${i + 4}`,
    moduleType: 'reading-writing' as const,
    difficulty: ['easy', 'medium', 'hard'][i % 3] as 'easy' | 'medium' | 'hard',
    category: ['reading-comprehension', 'grammar', 'vocabulary', 'writing-skills'][i % 4],
    question: `Reading and Writing question ${i + 4} for Module 1`,
    passage: i % 2 === 0 ? 'Sample passage for reading comprehension questions...' : undefined,
    options: [
      `Option A for question ${i + 4}`,
      `Option B for question ${i + 4}`,
      `Option C for question ${i + 4}`,
      `Option D for question ${i + 4}`
    ],
    correctAnswer: i % 4,
    explanation: `Explanation for question ${i + 4}`,
    timeEstimate: 60 + (i % 3) * 15
  }))
]

// Math Questions - Module 1
const mathModule1: Question[] = [
  {
    id: 'math1-1',
    moduleType: 'math',
    difficulty: 'medium',
    category: 'algebra',
    question: 'If 3x + 7 = 22, what is the value of x?',
    options: ['3', '5', '7', '15'],
    correctAnswer: 1,
    explanation: 'Subtract 7 from both sides: 3x = 15. Then divide by 3: x = 5.',
    timeEstimate: 120
  },
  {
    id: 'math1-2',
    moduleType: 'math',
    difficulty: 'medium',
    category: 'geometry',
    question: 'A circle has a radius of 6 units. What is its area? (Use π ≈ 3.14)',
    options: ['36π', '12π', '18π', '24π'],
    correctAnswer: 0,
    explanation: 'Area of a circle = πr². With r = 6, Area = π(6)² = 36π.',
    timeEstimate: 90
  },
  {
    id: 'math1-3',
    moduleType: 'math',
    difficulty: 'hard',
    category: 'algebra',
    question: 'If f(x) = 2x² - 3x + 1, what is f(3)?',
    options: ['10', '12', '16', '18'],
    correctAnswer: 0,
    explanation: 'f(3) = 2(3)² - 3(3) + 1 = 2(9) - 9 + 1 = 18 - 9 + 1 = 10.',
    timeEstimate: 150
  },
  // Add more questions to reach 22 total
  ...Array.from({ length: 19 }, (_, i) => ({
    id: `math1-${i + 4}`,
    moduleType: 'math' as const,
    difficulty: ['easy', 'medium', 'hard'][i % 3] as 'easy' | 'medium' | 'hard',
    category: ['algebra', 'geometry', 'statistics', 'advanced-math'][i % 4],
    question: `Math question ${i + 4} for Module 1`,
    options: [
      `${i + 1}`,
      `${i + 2}`,
      `${i + 3}`,
      `${i + 4}`
    ],
    correctAnswer: i % 4,
    explanation: `Explanation for math question ${i + 4}`,
    timeEstimate: 90 + (i % 3) * 30
  }))
]

// Reading and Writing Questions - Module 2 (Easy)
const readingWritingModule2Easy: Question[] = Array.from({ length: 27 }, (_, i) => ({
  id: `rw2e-${i + 1}`,
  moduleType: 'reading-writing' as const,
  difficulty: 'easy' as const,
  category: ['reading-comprehension', 'grammar', 'vocabulary', 'writing-skills'][i % 4],
  question: `Easy Reading and Writing question ${i + 1} for Module 2`,
  passage: i % 3 === 0 ? 'Easy passage for reading comprehension...' : undefined,
  options: [
    `Easy Option A for question ${i + 1}`,
    `Easy Option B for question ${i + 1}`,
    `Easy Option C for question ${i + 1}`,
    `Easy Option D for question ${i + 1}`
  ],
  correctAnswer: i % 4,
  explanation: `Easy explanation for question ${i + 1}`,
  timeEstimate: 45 + (i % 2) * 15
}))

// Reading and Writing Questions - Module 2 (Medium)
const readingWritingModule2Medium: Question[] = Array.from({ length: 27 }, (_, i) => ({
  id: `rw2m-${i + 1}`,
  moduleType: 'reading-writing' as const,
  difficulty: 'medium' as const,
  category: ['reading-comprehension', 'grammar', 'vocabulary', 'writing-skills'][i % 4],
  question: `Medium Reading and Writing question ${i + 1} for Module 2`,
  passage: i % 3 === 0 ? 'Medium complexity passage for reading comprehension...' : undefined,
  options: [
    `Medium Option A for question ${i + 1}`,
    `Medium Option B for question ${i + 1}`,
    `Medium Option C for question ${i + 1}`,
    `Medium Option D for question ${i + 1}`
  ],
  correctAnswer: i % 4,
  explanation: `Medium explanation for question ${i + 1}`,
  timeEstimate: 60 + (i % 2) * 15
}))

// Reading and Writing Questions - Module 2 (Hard)
const readingWritingModule2Hard: Question[] = Array.from({ length: 27 }, (_, i) => ({
  id: `rw2h-${i + 1}`,
  moduleType: 'reading-writing' as const,
  difficulty: 'hard' as const,
  category: ['reading-comprehension', 'grammar', 'vocabulary', 'writing-skills'][i % 4],
  question: `Hard Reading and Writing question ${i + 1} for Module 2`,
  passage: i % 3 === 0 ? 'Complex passage requiring advanced reading comprehension...' : undefined,
  options: [
    `Hard Option A for question ${i + 1}`,
    `Hard Option B for question ${i + 1}`,
    `Hard Option C for question ${i + 1}`,
    `Hard Option D for question ${i + 1}`
  ],
  correctAnswer: i % 4,
  explanation: `Hard explanation for question ${i + 1}`,
  timeEstimate: 90 + (i % 2) * 15
}))

// Math Questions - Module 2 (Easy)
const mathModule2Easy: Question[] = Array.from({ length: 22 }, (_, i) => ({
  id: `math2e-${i + 1}`,
  moduleType: 'math' as const,
  difficulty: 'easy' as const,
  category: ['algebra', 'geometry', 'statistics', 'advanced-math'][i % 4],
  question: `Easy Math question ${i + 1} for Module 2`,
  options: [
    `${i + 1}`,
    `${i + 2}`,
    `${i + 3}`,
    `${i + 4}`
  ],
  correctAnswer: i % 4,
  explanation: `Easy math explanation for question ${i + 1}`,
  timeEstimate: 60 + (i % 2) * 15
}))

// Math Questions - Module 2 (Medium)
const mathModule2Medium: Question[] = Array.from({ length: 22 }, (_, i) => ({
  id: `math2m-${i + 1}`,
  moduleType: 'math' as const,
  difficulty: 'medium' as const,
  category: ['algebra', 'geometry', 'statistics', 'advanced-math'][i % 4],
  question: `Medium Math question ${i + 1} for Module 2`,
  options: [
    `${i + 5}`,
    `${i + 6}`,
    `${i + 7}`,
    `${i + 8}`
  ],
  correctAnswer: i % 4,
  explanation: `Medium math explanation for question ${i + 1}`,
  timeEstimate: 90 + (i % 2) * 15
}))

// Math Questions - Module 2 (Hard)
const mathModule2Hard: Question[] = Array.from({ length: 22 }, (_, i) => ({
  id: `math2h-${i + 1}`,
  moduleType: 'math' as const,
  difficulty: 'hard' as const,
  category: ['algebra', 'geometry', 'statistics', 'advanced-math'][i % 4],
  question: `Hard Math question ${i + 1} for Module 2`,
  options: [
    `${i + 9}`,
    `${i + 10}`,
    `${i + 11}`,
    `${i + 12}`
  ],
  correctAnswer: i % 4,
  explanation: `Hard math explanation for question ${i + 1}`,
  timeEstimate: 120 + (i % 2) * 30
}))

export const QUESTION_POOLS: QuestionPool = {
  readingWriting: {
    module1: readingWritingModule1,
    module2Easy: readingWritingModule2Easy,
    module2Medium: readingWritingModule2Medium,
    module2Hard: readingWritingModule2Hard
  },
  math: {
    module1: mathModule1,
    module2Easy: mathModule2Easy,
    module2Medium: mathModule2Medium,
    module2Hard: mathModule2Hard
  }
}