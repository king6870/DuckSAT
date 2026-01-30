import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting enhanced database seed...')

  // Clear existing questions
  await prisma.questionResult.deleteMany()
  await prisma.question.deleteMany()
  
  console.log('🗑️ Cleared existing questions')

  // Enhanced Reading and Writing Questions
  const readingWritingQuestions = [
    {
      moduleType: 'reading-writing',
      difficulty: 'medium',
      category: 'reading-comprehension',
      subtopic: 'main-idea',
      question: 'Based on the passage, the author\'s primary purpose is to:',
      passage: `Climate change represents one of the most pressing challenges of our time. Scientists worldwide have reached a consensus that human activities, particularly the burning of fossil fuels, are the primary drivers of recent global warming. The evidence is overwhelming: rising global temperatures, melting ice caps, and increasingly frequent extreme weather events all point to the urgent need for action.

However, addressing climate change requires more than just scientific understanding—it demands coordinated global action, innovative technologies, and fundamental changes in how we produce and consume energy. The transition to renewable energy sources, while challenging, offers both environmental benefits and economic opportunities for nations willing to invest in clean technology.`,
      options: [
        'Criticize scientists for their research methods',
        'Explain the scientific consensus on climate change and the need for action',
        'Argue against taking action on climate change',
        'Compare different types of fossil fuels'
      ],
      correctAnswer: 1,
      explanation: 'The passage focuses on explaining that scientists have reached consensus about human-caused climate change and presents evidence supporting this view, then discusses the need for coordinated action to address the problem.',
      wrongAnswerExplanations: {
        0: 'The passage does not criticize scientists; instead, it supports their consensus on climate change.',
        2: 'The passage argues FOR taking action on climate change, not against it.',
        3: 'While fossil fuels are mentioned, the passage does not compare different types.'
      },
      timeEstimate: 90,
      source: 'DuckSAT Practice',
      tags: ['environment', 'science', 'policy']
    },
    {
      moduleType: 'reading-writing',
      difficulty: 'hard',
      category: 'reading-comprehension',
      subtopic: 'inference',
      question: 'The passage most strongly suggests that renewable energy transition:',
      passage: `The shift toward renewable energy has accelerated dramatically in the past decade, driven by technological advances and decreasing costs. Solar panel efficiency has improved by 40% while costs have dropped by 70%. Wind turbines now generate electricity at prices competitive with traditional fossil fuel plants in many regions.

Despite these advances, the transition faces significant obstacles. Energy storage remains expensive and technically challenging, particularly for large-scale grid applications. Additionally, existing infrastructure investments in fossil fuel systems create economic incentives to delay the transition, even when renewable alternatives become cost-competitive.`,
      options: [
        'Will happen automatically due to cost advantages',
        'Is primarily limited by technological constraints',
        'Faces both technical and economic barriers despite progress',
        'Should be abandoned due to storage problems'
      ],
      correctAnswer: 2,
      explanation: 'The passage describes both technological progress (improved efficiency, lower costs) and ongoing challenges (storage issues, infrastructure investments), indicating that multiple types of barriers exist.',
      wrongAnswerExplanations: {
        0: 'The passage mentions that economic incentives can delay transition even when renewables are cost-competitive.',
        1: 'The passage mentions both technical AND economic barriers, not just technological ones.',
        3: 'The passage presents storage as a challenge to overcome, not a reason to abandon renewable energy.'
      },
      timeEstimate: 120,
      source: 'DuckSAT Practice',
      tags: ['energy', 'economics', 'technology']
    },
    {
      moduleType: 'reading-writing',
      difficulty: 'easy',
      category: 'grammar',
      subtopic: 'transitions',
      question: 'Which choice provides the most effective transition between the two sentences?',
      options: [
        'However, this approach has limitations.',
        'In addition, scientists have discovered',
        'Therefore, the results were surprising.',
        'Meanwhile, other researchers disagree.'
      ],
      correctAnswer: 0,
      explanation: 'The word "However" creates an effective contrast that transitions between opposing ideas, showing a shift from positive to negative aspects.',
      wrongAnswerExplanations: {
        1: '"In addition" suggests adding similar information, not contrasting ideas.',
        2: '"Therefore" indicates a conclusion, which doesn\'t fit the context of presenting limitations.',
        3: '"Meanwhile" suggests simultaneous action, not a logical contrast.'
      },
      timeEstimate: 60,
      source: 'DuckSAT Practice',
      tags: ['transitions', 'coherence']
    },
    {
      moduleType: 'reading-writing',
      difficulty: 'medium',
      category: 'vocabulary',
      subtopic: 'context-clues',
      question: 'As used in line 15, "meticulous" most nearly means:',
      passage: 'The researcher\'s meticulous approach to data collection involved checking each measurement three times and documenting every step of the process in detailed notes.',
      options: ['Careless', 'Detailed', 'Quick', 'Expensive'],
      correctAnswer: 1,
      explanation: 'In context, "meticulous" describes an approach involving careful checking and detailed documentation, which means thorough and detailed.',
      wrongAnswerExplanations: {
        0: 'Careless is the opposite of meticulous, which involves careful attention to detail.',
        2: 'Quick contradicts the description of checking measurements multiple times.',
        3: 'Expensive is not related to the careful, detailed approach described.'
      },
      timeEstimate: 45,
      source: 'DuckSAT Practice',
      tags: ['vocabulary', 'context']
    }
  ]

  // Enhanced Math Questions with Charts and Detailed Explanations
  const mathQuestions = [
    {
      moduleType: 'math',
      difficulty: 'medium',
      category: 'algebra',
      subtopic: 'linear-equations',
      question: 'If 3x + 7 = 22, what is the value of x?',
      options: ['3', '5', '7', '15'],
      correctAnswer: 1,
      explanation: 'To solve 3x + 7 = 22:\n1. Subtract 7 from both sides: 3x = 15\n2. Divide both sides by 3: x = 5\n\nVerification: 3(5) + 7 = 15 + 7 = 22 ✓',
      wrongAnswerExplanations: {
        0: 'If x = 3, then 3(3) + 7 = 9 + 7 = 16 ≠ 22',
        2: 'If x = 7, then 3(7) + 7 = 21 + 7 = 28 ≠ 22',
        3: 'If x = 15, then 3(15) + 7 = 45 + 7 = 52 ≠ 22'
      },
      timeEstimate: 120,
      source: 'DuckSAT Practice',
      tags: ['linear-equations', 'solving']
    },
    {
      moduleType: 'math',
      difficulty: 'hard',
      category: 'geometry',
      subtopic: 'coordinate-geometry',
      question: 'In the coordinate plane, what is the distance between points A(2, 3) and B(8, 11)?',
      options: ['6', '8', '10', '14'],
      correctAnswer: 2,
      explanation: 'Use the distance formula: d = √[(x₂-x₁)² + (y₂-y₁)²]\n\nd = √[(8-2)² + (11-3)²]\nd = √[6² + 8²]\nd = √[36 + 64]\nd = √100 = 10',
      wrongAnswerExplanations: {
        0: 'This is just the difference in x-coordinates (8-2=6), not the full distance.',
        1: 'This is just the difference in y-coordinates (11-3=8), not the full distance.',
        3: 'This would be the sum of coordinate differences (6+8=14), not the distance.'
      },
      imageUrl: '/images/coordinate-plane-distance.png',
      imageAlt: 'Coordinate plane showing points A(2,3) and B(8,11) with distance line',
      chartData: {
        type: 'scatter',
        points: [
          { x: 2, y: 3, label: 'A' },
          { x: 8, y: 11, label: 'B' }
        ],
        line: { from: [2, 3], to: [8, 11] }
      },
      timeEstimate: 150,
      source: 'DuckSAT Practice',
      tags: ['distance-formula', 'coordinates']
    },
    {
      moduleType: 'math',
      difficulty: 'medium',
      category: 'algebra',
      subtopic: 'quadratic-functions',
      question: 'If f(x) = 2x² - 3x + 1, what is f(3)?',
      options: ['10', '12', '16', '18'],
      correctAnswer: 0,
      explanation: 'Substitute x = 3 into f(x) = 2x² - 3x + 1:\n\nf(3) = 2(3)² - 3(3) + 1\nf(3) = 2(9) - 9 + 1\nf(3) = 18 - 9 + 1\nf(3) = 10',
      wrongAnswerExplanations: {
        1: 'This might result from calculating 2(3)² - 3(3) = 18 - 9 = 9, then adding 3 instead of 1.',
        2: 'This might result from forgetting to subtract 3x: 2(9) + 1 = 19, but this doesn\'t match any calculation.',
        3: 'This is just 2(3)² = 18, forgetting the other terms entirely.'
      },
      timeEstimate: 90,
      source: 'DuckSAT Practice',
      tags: ['functions', 'substitution']
    },
    {
      moduleType: 'math',
      difficulty: 'hard',
      category: 'statistics',
      subtopic: 'data-analysis',
      question: 'The table shows test scores for 5 students. What is the median score?',
      passage: 'Student Scores: Alice: 85, Bob: 92, Carol: 78, David: 88, Emma: 95',
      options: ['85', '87.6', '88', '92'],
      correctAnswer: 2,
      explanation: 'To find the median:\n1. Arrange scores in order: 78, 85, 88, 92, 95\n2. The median is the middle value (3rd out of 5)\n3. Median = 88',
      wrongAnswerExplanations: {
        0: 'This is the second value in the ordered list, not the middle (median).',
        1: 'This is the mean (average): (78+85+88+92+95)÷5 = 438÷5 = 87.6, not the median.',
        3: 'This is the fourth value in the ordered list, not the middle (median).'
      },
      chartData: {
        type: 'bar',
        data: [
          { student: 'Carol', score: 78 },
          { student: 'Alice', score: 85 },
          { student: 'David', score: 88 },
          { student: 'Bob', score: 92 },
          { student: 'Emma', score: 95 }
        ]
      },
      timeEstimate: 120,
      source: 'DuckSAT Practice',
      tags: ['median', 'statistics']
    }
  ]

  // Add more questions to reach a good sample size
  const additionalReadingQuestions = []
  for (let i = 5; i <= 15; i++) {
    additionalReadingQuestions.push({
      moduleType: 'reading-writing',
      difficulty: ['easy', 'medium', 'hard'][(i - 1) % 3] as 'easy' | 'medium' | 'hard',
      category: ['reading-comprehension', 'grammar', 'vocabulary', 'writing-skills'][(i - 1) % 4],
      subtopic: ['main-idea', 'inference', 'transitions', 'context-clues', 'sentence-structure'][(i - 1) % 5],
      question: `Reading and Writing question ${i}: Which choice best completes the sentence?`,
      passage: i % 2 === 0 ? `Sample passage for question ${i}. This passage provides context for understanding the question and requires careful reading to identify the correct answer.` : undefined,
      options: [
        `Option A for question ${i}`,
        `Option B for question ${i}`,
        `Option C for question ${i}`,
        `Option D for question ${i}`
      ],
      correctAnswer: (i - 1) % 4,
      explanation: `Detailed explanation for question ${i}. This explains why the correct answer is right and provides the reasoning behind the choice.`,
      wrongAnswerExplanations: {
        [String((i) % 4)]: `Wrong answer explanation for option ${String.fromCharCode(65 + (i % 4))}`,
        [String((i + 1) % 4)]: `Wrong answer explanation for option ${String.fromCharCode(65 + ((i + 1) % 4))}`,
        [String((i + 2) % 4)]: `Wrong answer explanation for option ${String.fromCharCode(65 + ((i + 2) % 4))}`
      },
      timeEstimate: 60 + ((i - 1) % 3) * 15,
      source: 'DuckSAT Practice',
      tags: ['practice', 'sample']
    })
  }

  const additionalMathQuestions = []
  for (let i = 5; i <= 15; i++) {
    additionalMathQuestions.push({
      moduleType: 'math',
      difficulty: ['easy', 'medium', 'hard'][(i - 1) % 3] as 'easy' | 'medium' | 'hard',
      category: ['algebra', 'geometry', 'statistics', 'advanced-math'][(i - 1) % 4],
      subtopic: ['linear-equations', 'quadratic-functions', 'coordinate-geometry', 'data-analysis'][(i - 1) % 4],
      question: `Math question ${i}: Solve for the value.`,
      options: [
        `${i + 1}`,
        `${i + 2}`,
        `${i + 3}`,
        `${i + 4}`
      ],
      correctAnswer: (i - 1) % 4,
      explanation: `Step-by-step solution for question ${i}:\n1. First step of solution\n2. Second step of solution\n3. Final answer: ${i + 1 + ((i - 1) % 4)}`,
      wrongAnswerExplanations: {
        [String((i) % 4)]: `This answer results from a common error in step 2 of the solution.`,
        [String((i + 1) % 4)]: `This answer results from forgetting to apply the correct operation.`,
        [String((i + 2) % 4)]: `This answer results from a calculation mistake in the final step.`
      },
      imageUrl: i % 3 === 0 ? `/images/math-diagram-${i}.png` : undefined,
      imageAlt: i % 3 === 0 ? `Mathematical diagram for question ${i}` : undefined,
      chartData: i % 4 === 0 ? {
        type: 'line',
        data: [
          { x: 0, y: i },
          { x: 1, y: i + 1 },
          { x: 2, y: i + 2 }
        ]
      } : undefined,
      timeEstimate: 90 + ((i - 1) % 3) * 30,
      source: 'DuckSAT Practice',
      tags: ['practice', 'sample']
    })
  }

  // Combine all questions
  const allQuestions = [
    ...readingWritingQuestions,
    ...mathQuestions,
    ...additionalReadingQuestions,
    ...additionalMathQuestions
  ]
  
  console.log(`📝 Creating ${allQuestions.length} enhanced questions...`)
  
  for (const questionData of allQuestions) {
    const data: any = {
      moduleType: questionData.moduleType,
      difficulty: questionData.difficulty,
      category: questionData.category,
      subtopic: (questionData as any).subtopic || null,
      question: questionData.question,
      passage: (questionData as any).passage || null,
      options: questionData.options,
      correctAnswer: questionData.correctAnswer,
      explanation: questionData.explanation,
      wrongAnswerExplanations: (questionData as any).wrongAnswerExplanations || {},
      imageUrl: (questionData as any).imageUrl || null,
      imageAlt: (questionData as any).imageAlt || null,
      chartData: (questionData as any).chartData || null,
      timeEstimate: questionData.timeEstimate,
      source: (questionData as any).source || null,
      tags: (questionData as any).tags || []
    }
    
    await prisma.question.create({ data })
  }

  console.log('✅ Enhanced database seeded successfully!')
  console.log(`📊 Created ${allQuestions.length} questions with comprehensive features:`)
  console.log(`📚 Reading/Writing: ${readingWritingQuestions.length + additionalReadingQuestions.length} questions`)
  console.log(`🔢 Math: ${mathQuestions.length + additionalMathQuestions.length} questions`)
  console.log(`🎯 Features included:`)
  console.log(`   • Detailed passages and context`)
  console.log(`   • Subtopic categorization`)
  console.log(`   • Comprehensive explanations`)
  console.log(`   • Wrong answer explanations`)
  console.log(`   • Math diagrams and charts`)
  console.log(`   • Difficulty levels and timing`)
  console.log(`   • Source attribution and tags`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
