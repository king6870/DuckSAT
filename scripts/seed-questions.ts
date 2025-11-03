import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const REAL_SAT_QUESTIONS = [
  // Reading & Writing Questions
  {
    moduleType: 'reading-writing',
    difficulty: 'medium',
    category: 'Reading Comprehension',
    subtopic: 'Main Ideas',
    question: 'Which choice best states the main purpose of the text?',
    passage: 'Many archaeologists believe that the first humans to populate the Americas crossed a land bridge from Asia during the last Ice Age. However, recent discoveries of ancient tools and artifacts along the Pacific coast suggest that some early peoples may have traveled by boat, following a coastal route. This coastal migration theory challenges the traditional land bridge model and suggests that the peopling of the Americas was more complex than previously thought.',
    options: [
      'To argue that the land bridge theory is completely incorrect',
      'To present evidence for an alternative theory about early migration to the Americas',
      'To describe the tools used by early American peoples',
      'To explain why the Ice Age was important for human migration'
    ],
    correctAnswer: 1,
    explanation: 'The text presents the coastal migration theory as an alternative to the traditional land bridge theory.',
    timeEstimate: 90
  },
  {
    moduleType: 'reading-writing',
    difficulty: 'hard',
    category: 'Grammar',
    subtopic: 'Punctuation',
    question: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    passage: 'The scientist carefully recorded her observations in the laboratory notebook, noting the temperature, humidity, and pressure readings _____ she also documented any unusual phenomena she observed during the experiment.',
    options: [
      'readings, and',
      'readings; and',
      'readings. And',
      'readings and'
    ],
    correctAnswer: 1,
    explanation: 'A semicolon is needed before "and" when connecting two independent clauses.',
    timeEstimate: 60
  },
  {
    moduleType: 'reading-writing',
    difficulty: 'easy',
    category: 'Vocabulary',
    subtopic: 'Context Clues',
    question: 'As used in the text, what does "meticulous" most nearly mean?',
    passage: 'The restoration of the ancient manuscript required meticulous attention to detail. Each page had to be carefully cleaned, and every tear had to be precisely repaired to preserve the document\'s historical integrity.',
    options: [
      'Quick',
      'Careful',
      'Expensive',
      'Difficult'
    ],
    correctAnswer: 1,
    explanation: 'Context clues like "carefully cleaned" and "precisely repaired" indicate meticulous means careful.',
    timeEstimate: 45
  },

  // Math Questions
  {
    moduleType: 'math',
    difficulty: 'medium',
    category: 'Algebra',
    subtopic: 'Linear Equations',
    question: 'If 3x + 7 = 22, what is the value of x?',
    options: ['3', '5', '7', '15'],
    correctAnswer: 1,
    explanation: 'Solving: 3x + 7 = 22, so 3x = 15, therefore x = 5',
    timeEstimate: 60
  },
  {
    moduleType: 'math',
    difficulty: 'hard',
    category: 'Geometry',
    subtopic: 'Circles',
    question: 'A circle has a circumference of 12π units. What is the area of the circle?',
    options: ['6π', '12π', '36π', '144π'],
    correctAnswer: 2,
    explanation: 'If circumference = 12π, then 2πr = 12π, so r = 6. Area = πr² = π(6)² = 36π',
    timeEstimate: 90
  },
  {
    moduleType: 'math',
    difficulty: 'easy',
    category: 'Arithmetic',
    subtopic: 'Percentages',
    question: 'What is 15% of 200?',
    options: ['15', '30', '45', '60'],
    correctAnswer: 1,
    explanation: '15% of 200 = 0.15 × 200 = 30',
    timeEstimate: 45
  },
  {
    moduleType: 'math',
    difficulty: 'medium',
    category: 'Statistics',
    subtopic: 'Mean and Median',
    question: 'The scores on a test are: 85, 92, 78, 96, 89. What is the median score?',
    options: ['85', '89', '92', '88'],
    correctAnswer: 1,
    explanation: 'Arranging in order: 78, 85, 89, 92, 96. The median is the middle value: 89',
    timeEstimate: 75
  }
]

async function seedQuestions() {
  console.log('🌱 Seeding database with SAT questions...')
  
  try {
    // Clear existing questions
    await prisma.question.deleteMany()
    console.log('✅ Cleared existing questions')

    // Insert new questions
    for (const questionData of REAL_SAT_QUESTIONS) {
      await prisma.question.create({
        data: {
          ...questionData,
          passage: questionData.passage || null,
          wrongAnswerExplanations: {},
          chartData: undefined,
          imageUrl: null,
          imageAlt: null,
          source: 'SAT Practice',
          tags: [questionData.category.toLowerCase().replace(' ', '-')],
          isActive: true
        }
      })
    }

    // Generate more questions by duplicating with variations
    const additionalQuestions = []
    for (let i = 0; i < 50; i++) {
      const baseQuestion = REAL_SAT_QUESTIONS[i % REAL_SAT_QUESTIONS.length]
      additionalQuestions.push({
        ...baseQuestion,
        question: `${baseQuestion.question} (Variation ${i + 1})`,
        passage: baseQuestion.passage ? `${baseQuestion.passage} (Practice ${i + 1})` : null
      })
    }

    for (const questionData of additionalQuestions) {
      await prisma.question.create({
        data: {
          ...questionData,
          passage: questionData.passage || null,
          wrongAnswerExplanations: {},
          chartData: undefined,
          imageUrl: null,
          imageAlt: null,
          source: 'SAT Practice',
          tags: [questionData.category.toLowerCase().replace(' ', '-')],
          isActive: true
        }
      })
    }

    const totalQuestions = await prisma.question.count()
    console.log(`✅ Successfully seeded ${totalQuestions} questions`)
    
    // Show breakdown
    const mathCount = await prisma.question.count({ where: { moduleType: 'math' } })
    const readingCount = await prisma.question.count({ where: { moduleType: 'reading-writing' } })
    
    console.log(`📊 Breakdown:`)
    console.log(`   Math: ${mathCount} questions`)
    console.log(`   Reading & Writing: ${readingCount} questions`)
    
  } catch (error) {
    console.error('❌ Error seeding questions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedQuestions()
