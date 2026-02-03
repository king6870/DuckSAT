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
      passage: 'Solar panels have become increasingly efficient and affordable in recent years. Many homeowners are now considering them as a viable energy option. ____ the installation costs remain prohibitively high for some families, preventing widespread adoption.',
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
      question: 'Five students received the following test scores: Alice: 85, Bob: 92, Carol: 78, David: 88, Emma: 95. What is the median score?',
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
  
  // Actual diverse reading passages and questions
  const readingPassages = [
    {
      passage: `The discovery of penicillin by Alexander Fleming in 1928 marked a turning point in medical history. Fleming noticed that a mold called Penicillium notatum had contaminated one of his bacterial cultures and killed the surrounding bacteria. This accidental observation led to the development of the first widely used antibiotic, revolutionizing the treatment of bacterial infections. Before penicillin, simple infections could be fatal, and surgical procedures carried enormous risks. The introduction of antibiotics transformed medicine, saving countless lives and enabling complex surgical interventions that were previously impossible.`,
      questions: [
        {
          question: 'According to the passage, Fleming\'s discovery was significant primarily because it:',
          options: [
            'Proved that bacteria could be grown in laboratory cultures',
            'Enabled the treatment of previously fatal bacterial infections',
            'Showed that molds could contaminate scientific experiments',
            'Demonstrated that surgical procedures were becoming safer'
          ],
          correctAnswer: 1,
          explanation: 'The passage states that penicillin revolutionized treatment of bacterial infections and transformed medicine, saving countless lives. This was the primary significance.',
          wrongAnswerExplanations: {
            0: 'Growing bacteria in cultures was already possible; the discovery was about killing bacteria, not growing them.',
            2: 'While contamination occurred, the significance was in the therapeutic application, not just observing contamination.',
            3: 'Surgical safety improved as a result of antibiotics, but this was a consequence, not the primary significance.'
          }
        }
      ]
    },
    {
      passage: `Urban heat islands are metropolitan areas that experience significantly higher temperatures than surrounding rural areas. This phenomenon results from human activities and built environments that absorb and retain heat. Dark surfaces like asphalt and concrete absorb solar radiation during the day and release it slowly at night, preventing cities from cooling effectively. The lack of vegetation reduces evaporative cooling, while waste heat from vehicles, air conditioning, and industrial processes adds to the thermal load. Heat islands can raise urban temperatures by 1-7°F during the day and up to 5°F at night, increasing energy costs, air pollution, and heat-related illnesses.`,
      questions: [
        {
          question: 'Which of the following best describes the main cause of urban heat islands according to the passage?',
          options: [
            'Industrial processes that generate waste heat',
            'The combination of heat-absorbing surfaces and reduced vegetation',
            'Air conditioning systems that release hot air',
            'Vehicle emissions that trap heat in the atmosphere'
          ],
          correctAnswer: 1,
          explanation: 'The passage identifies heat-absorbing dark surfaces and lack of vegetation as the primary causes, with other factors adding to the effect.',
          wrongAnswerExplanations: {
            0: 'Industrial processes are mentioned as adding to thermal load, but not as the main cause.',
            2: 'Air conditioning is mentioned as one contributing factor among several, not the main cause.',
            3: 'Vehicle waste heat is mentioned as a contributor, but emissions trapping heat is not the mechanism described.'
          }
        }
      ]
    },
    {
      passage: `The concept of "flow state" in psychology describes a mental state where a person is fully immersed in an activity with energized focus and enjoyment. Psychologist Mihaly Csikszentmihalyi identified key conditions for flow: clear goals, immediate feedback, and a balance between challenge and skill level. When challenges exceed skills, anxiety results; when skills exceed challenges, boredom occurs. Flow states enhance performance, creativity, and well-being, making them valuable in education, sports, and workplace settings. Research suggests that people in flow states lose track of time, experience reduced self-consciousness, and find the activity intrinsically rewarding.`,
      questions: [
        {
          question: 'Based on the passage, flow state is most likely to occur when:',
          options: [
            'The activity is extremely easy and relaxing',
            'Challenges and skills are appropriately balanced',
            'A person feels anxious about their performance',
            'The activity has no clear goals or feedback'
          ],
          correctAnswer: 1,
          explanation: 'The passage explicitly states that flow requires a balance between challenge and skill level, with clear goals and feedback.',
          wrongAnswerExplanations: {
            0: 'Easy activities lead to boredom when skills exceed challenges, preventing flow state.',
            2: 'Anxiety occurs when challenges exceed skills, which is the opposite condition for flow.',
            3: 'Clear goals and immediate feedback are identified as key conditions for flow, so their absence would prevent it.'
          }
        }
      ]
    }
  ]

  let passageIndex = 0
  for (let i = 5; i <= 20; i++) {
    const passageData = readingPassages[passageIndex % readingPassages.length]
    const questionData = passageData.questions[0]
    
    additionalReadingQuestions.push({
      moduleType: 'reading-writing',
      difficulty: ['easy', 'medium', 'hard'][(i - 1) % 3] as 'easy' | 'medium' | 'hard',
      category: ['reading-comprehension', 'vocabulary', 'rhetoric', 'synthesis'][passageIndex % 4],
      subtopic: ['main-idea', 'inference', 'context-clues', 'purpose', 'textual-support'][passageIndex % 5],
      question: questionData.question,
      passage: passageData.passage,
      options: questionData.options,
      correctAnswer: questionData.correctAnswer,
      explanation: questionData.explanation,
      wrongAnswerExplanations: questionData.wrongAnswerExplanations,
      timeEstimate: 75 + ((i - 1) % 3) * 30,
      source: 'DuckSAT Practice',
      tags: ['reading', 'comprehension', 'analysis']
    })
    
    passageIndex++
  }

  const additionalMathQuestions = []
  
  // Actual diverse math problems
  const mathProblems = [
    {
      category: 'algebra',
      subtopic: 'linear-equations',
      question: 'If 5(x - 3) = 2x + 9, what is the value of x?',
      options: ['4', '6', '8', '12'],
      correctAnswer: 2,
      explanation: 'Expand: 5x - 15 = 2x + 9\nSubtract 2x: 3x - 15 = 9\nAdd 15: 3x = 24\nDivide by 3: x = 8',
      wrongAnswerExplanations: {
        0: 'Check your algebra steps. You may have made an error when combining like terms.',
        1: 'This would be correct if the equation were 5(x-3) = 2x + 3, but the constant is 9.',
        3: 'This is the value of 3x, not x. Remember to divide by 3 in the final step.'
      }
    },
    {
      category: 'geometry',
      subtopic: 'circles',
      question: 'A circle has a radius of 6 cm. What is its circumference? (Use π ≈ 3.14)',
      options: ['18.84 cm', '37.68 cm', '113.04 cm', '12 cm'],
      correctAnswer: 1,
      explanation: 'Circumference = 2πr = 2 × 3.14 × 6 = 37.68 cm',
      wrongAnswerExplanations: {
        0: 'This is πr (half the circumference formula). You forgot to multiply by 2.',
        2: 'This is the area formula (πr²), not circumference.',
        3: 'This is just the diameter (2r), but you need to multiply by π as well.'
      }
    },
    {
      category: 'statistics',
      subtopic: 'probability',
      question: 'A fair six-sided die is rolled. What is the probability of rolling a number greater than 4?',
      options: ['1/6', '1/3', '1/2', '2/3'],
      correctAnswer: 1,
      explanation: 'Numbers greater than 4 are: 5 and 6 (2 favorable outcomes)\nTotal possible outcomes: 6\nProbability = 2/6 = 1/3',
      wrongAnswerExplanations: {
        0: 'This is the probability of rolling a specific number (like 5), not any number greater than 4.',
        2: 'This would be true if there were 3 numbers greater than 4, but only 5 and 6 qualify.',
        3: 'This would be the probability of rolling 4 or less, not greater than 4.'
      }
    },
    {
      category: 'algebra',
      subtopic: 'quadratic-functions',
      question: 'What are the solutions to x² - 7x + 12 = 0?',
      options: ['x = 2 and x = 6', 'x = 3 and x = 4', 'x = -3 and x = -4', 'x = 1 and x = 12'],
      correctAnswer: 1,
      explanation: 'Factor: (x - 3)(x - 4) = 0\nSet each factor to zero:\nx - 3 = 0, so x = 3\nx - 4 = 0, so x = 4\nVerify: 3² - 7(3) + 12 = 9 - 21 + 12 = 0 ✓',
      wrongAnswerExplanations: {
        0: 'Check the factorization: (x-2)(x-6) = x² - 8x + 12, not x² - 7x + 12.',
        2: 'The signs should be positive because the product is +12 and the sum is -7.',
        3: '(x-1)(x-12) = x² - 13x + 12, which doesn\'t match the middle term.'
      }
    },
    {
      category: 'geometry',
      subtopic: 'area-perimeter',
      question: 'A rectangle has a length of 12 m and a width of 5 m. What is its area?',
      options: ['17 m²', '34 m²', '60 m²', '120 m²'],
      correctAnswer: 2,
      explanation: 'Area of rectangle = length × width = 12 × 5 = 60 m²',
      wrongAnswerExplanations: {
        0: 'This is length + width, but area requires multiplication.',
        1: 'This is the perimeter (2(12+5) = 34), not the area.',
        3: 'You may have calculated 2 × length × width, but area is just length × width.'
      }
    },
    {
      category: 'advanced-math',
      subtopic: 'exponents',
      question: 'Simplify: (2³)²',
      options: ['2⁵', '2⁶', '4⁶', '8²'],
      correctAnswer: 1,
      explanation: 'When raising a power to a power, multiply exponents: (2³)² = 2³ˣ² = 2⁶ = 64',
      wrongAnswerExplanations: {
        0: 'This would be 2³ × 2², not (2³)². With powers, you multiply exponents, not add them.',
        2: 'You might have computed 2³ = 8 first, but then you should have 8², which equals 2⁶.',
        3: 'This equals 64, which is correct numerically, but 2⁶ is the simplified form with base 2.'
      }
    },
    {
      category: 'data-analysis',
      subtopic: 'mean-median',
      question: 'Find the mean of: 15, 22, 18, 25, 20',
      options: ['18', '20', '22', '100'],
      correctAnswer: 1,
      explanation: 'Mean = sum of values / count = (15+22+18+25+20) / 5 = 100 / 5 = 20',
      wrongAnswerExplanations: {
        0: 'This is one of the values in the set, but not the mean.',
        2: 'This is the median (middle value when ordered), not the mean.',
        3: 'This is the sum of all values, but you need to divide by 5 to get the mean.'
      }
    },
    {
      category: 'algebra',
      subtopic: 'systems-equations',
      question: 'Solve the system: x + y = 10 and x - y = 2. What is x?',
      options: ['4', '6', '8', '12'],
      correctAnswer: 1,
      explanation: 'Add the equations: (x+y) + (x-y) = 10 + 2\n2x = 12\nx = 6\nVerify: If x=6, then y=4 (from first equation), and 6-4=2 ✓',
      wrongAnswerExplanations: {
        0: 'This is the value of y, not x. Check which variable you\'re solving for.',
        2: 'This might result from subtracting instead of adding the equations.',
        3: 'This is 2x, but you need to divide by 2 to get x.'
      }
    }
  ]

  for (let i = 5; i <= 20; i++) {
    const mathData = mathProblems[(i - 5) % mathProblems.length]
    additionalMathQuestions.push({
      moduleType: 'math',
      difficulty: ['easy', 'medium', 'hard'][(i - 1) % 3] as 'easy' | 'medium' | 'hard',
      category: mathData.category,
      subtopic: mathData.subtopic,
      question: mathData.question,
      options: mathData.options,
      correctAnswer: mathData.correctAnswer,
      explanation: mathData.explanation,
      wrongAnswerExplanations: mathData.wrongAnswerExplanations,
      imageUrl: undefined,
      imageAlt: undefined,
      chartData: undefined,
      timeEstimate: 90 + ((i - 1) % 3) * 30,
      source: 'DuckSAT Practice',
      tags: ['math', mathData.category, mathData.subtopic]
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
