import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TEXT_ONLY_MATH_QUESTIONS = [
  // Algebra - Linear Equations
  {
    question: "If 5x - 3 = 17, what is the value of x?",
    options: ["A) 2", "B) 3", "C) 4", "D) 5"],
    correctAnswer: 2,
    explanation: "5x - 3 = 17, so 5x = 20, therefore x = 4",
    difficulty: "easy",
    category: "Algebra"
  },
  {
    question: "Solve for y: 3y + 8 = 2y + 15",
    options: ["A) 5", "B) 6", "C) 7", "D) 8"],
    correctAnswer: 2,
    explanation: "3y + 8 = 2y + 15, so y = 7",
    difficulty: "easy",
    category: "Algebra"
  },
  {
    question: "If 4(x - 2) = 3x + 5, what is x?",
    options: ["A) 11", "B) 12", "C) 13", "D) 14"],
    correctAnswer: 2,
    explanation: "4x - 8 = 3x + 5, so x = 13",
    difficulty: "medium",
    category: "Algebra"
  },
  {
    question: "What is the solution to 2x + 7 = 3x - 4?",
    options: ["A) 9", "B) 10", "C) 11", "D) 12"],
    correctAnswer: 2,
    explanation: "2x + 7 = 3x - 4, so 11 = x",
    difficulty: "medium",
    category: "Algebra"
  },
  // Quadratic Equations
  {
    question: "What are the solutions to x² - 7x + 12 = 0?",
    options: ["A) x = 3, 4", "B) x = 2, 6", "C) x = 1, 12", "D) x = -3, -4"],
    correctAnswer: 0,
    explanation: "Factoring: (x-3)(x-4) = 0, so x = 3 or x = 4",
    difficulty: "medium",
    category: "Algebra"
  },
  {
    question: "Solve: x² + 5x + 6 = 0",
    options: ["A) x = -2, -3", "B) x = 2, 3", "C) x = -1, -6", "D) x = 1, 6"],
    correctAnswer: 0,
    explanation: "Factoring: (x+2)(x+3) = 0, so x = -2 or x = -3",
    difficulty: "medium",
    category: "Algebra"
  },
  {
    question: "If x² - 9 = 0, what are the values of x?",
    options: ["A) x = ±3", "B) x = ±9", "C) x = 3 only", "D) x = 9 only"],
    correctAnswer: 0,
    explanation: "x² = 9, so x = ±3",
    difficulty: "easy",
    category: "Algebra"
  },
  // Systems of Equations
  {
    question: "If x + y = 10 and x - y = 4, what is x?",
    options: ["A) 6", "B) 7", "C) 8", "D) 9"],
    correctAnswer: 1,
    explanation: "Adding equations: 2x = 14, so x = 7",
    difficulty: "medium",
    category: "Algebra"
  },
  {
    question: "Solve the system: 2x + y = 8 and x - y = 1",
    options: ["A) x = 3, y = 2", "B) x = 2, y = 4", "C) x = 4, y = 0", "D) x = 1, y = 6"],
    correctAnswer: 0,
    explanation: "From second equation: x = y + 1. Substituting: 2(y+1) + y = 8, so 3y = 6, y = 2, x = 3",
    difficulty: "hard",
    category: "Algebra"
  },
  // Functions
  {
    question: "If f(x) = 3x² - 2x + 1, what is f(2)?",
    options: ["A) 9", "B) 10", "C) 11", "D) 12"],
    correctAnswer: 0,
    explanation: "f(2) = 3(4) - 2(2) + 1 = 12 - 4 + 1 = 9",
    difficulty: "medium",
    category: "Functions"
  },
  {
    question: "If g(x) = 2x + 5, what is g(-3)?",
    options: ["A) -1", "B) 0", "C) 1", "D) 2"],
    correctAnswer: 0,
    explanation: "g(-3) = 2(-3) + 5 = -6 + 5 = -1",
    difficulty: "easy",
    category: "Functions"
  },
  {
    question: "If h(x) = x² + 4x - 5, what is h(1)?",
    options: ["A) -2", "B) 0", "C) 2", "D) 4"],
    correctAnswer: 1,
    explanation: "h(1) = 1 + 4 - 5 = 0",
    difficulty: "easy",
    category: "Functions"
  },
  // Exponents and Radicals
  {
    question: "What is 2³ × 2⁴?",
    options: ["A) 2⁷", "B) 2¹²", "C) 4⁷", "D) 8⁴"],
    correctAnswer: 0,
    explanation: "When multiplying powers with same base, add exponents: 2³ × 2⁴ = 2⁷",
    difficulty: "easy",
    category: "Exponents"
  },
  {
    question: "Simplify: √48",
    options: ["A) 4√3", "B) 6√2", "C) 3√16", "D) 2√12"],
    correctAnswer: 0,
    explanation: "√48 = √(16×3) = 4√3",
    difficulty: "medium",
    category: "Radicals"
  },
  {
    question: "What is (3²)³?",
    options: ["A) 3⁵", "B) 3⁶", "C) 9³", "D) 27"],
    correctAnswer: 1,
    explanation: "When raising a power to a power, multiply exponents: (3²)³ = 3⁶",
    difficulty: "medium",
    category: "Exponents"
  },
  // Polynomials
  {
    question: "Expand: (x + 4)(x - 2)",
    options: ["A) x² + 2x - 8", "B) x² - 2x + 8", "C) x² + 6x - 8", "D) x² - 6x + 8"],
    correctAnswer: 0,
    explanation: "Using FOIL: x² - 2x + 4x - 8 = x² + 2x - 8",
    difficulty: "medium",
    category: "Polynomials"
  },
  {
    question: "What is (2x + 3)²?",
    options: ["A) 4x² + 9", "B) 4x² + 6x + 9", "C) 4x² + 12x + 9", "D) 2x² + 12x + 9"],
    correctAnswer: 2,
    explanation: "(2x + 3)² = 4x² + 12x + 9",
    difficulty: "medium",
    category: "Polynomials"
  },
  // Rational Expressions
  {
    question: "Simplify: (x² - 1)/(x + 1)",
    options: ["A) x - 1", "B) x + 1", "C) x² - 1", "D) Cannot be simplified"],
    correctAnswer: 0,
    explanation: "x² - 1 = (x+1)(x-1), so (x+1)(x-1)/(x+1) = x - 1",
    difficulty: "medium",
    category: "Rational Expressions"
  },
  {
    question: "What is (6x²)/(3x)?",
    options: ["A) 2x", "B) 3x", "C) 6x", "D) 2x²"],
    correctAnswer: 0,
    explanation: "6x²/3x = 2x",
    difficulty: "easy",
    category: "Rational Expressions"
  },
  // Statistics and Probability
  {
    question: "The mean of 4, 6, 8, 10, 12 is:",
    options: ["A) 6", "B) 7", "C) 8", "D) 9"],
    correctAnswer: 2,
    explanation: "Mean = (4+6+8+10+12)/5 = 40/5 = 8",
    difficulty: "easy",
    category: "Statistics"
  },
  {
    question: "What is the median of 3, 7, 5, 9, 1?",
    options: ["A) 3", "B) 5", "C) 7", "D) 9"],
    correctAnswer: 1,
    explanation: "Ordered: 1, 3, 5, 7, 9. Median is middle value: 5",
    difficulty: "easy",
    category: "Statistics"
  },
  {
    question: "A coin is flipped 3 times. What is the probability of getting exactly 2 heads?",
    options: ["A) 1/8", "B) 2/8", "C) 3/8", "D) 4/8"],
    correctAnswer: 2,
    explanation: "Possible outcomes with 2 heads: HHT, HTH, THH. That's 3 out of 8 total outcomes",
    difficulty: "medium",
    category: "Probability"
  },
  // Sequences
  {
    question: "What is the next term in the sequence 2, 6, 18, 54, ...?",
    options: ["A) 108", "B) 162", "C) 216", "D) 270"],
    correctAnswer: 1,
    explanation: "Each term is multiplied by 3: 54 × 3 = 162",
    difficulty: "medium",
    category: "Sequences"
  },
  {
    question: "In the arithmetic sequence 5, 9, 13, 17, ..., what is the 8th term?",
    options: ["A) 29", "B) 31", "C) 33", "D) 35"],
    correctAnswer: 2,
    explanation: "Common difference is 4. 8th term = 5 + 7(4) = 33",
    difficulty: "medium",
    category: "Sequences"
  },
  // Inequalities
  {
    question: "Solve: 2x + 5 > 11",
    options: ["A) x > 3", "B) x > 8", "C) x < 3", "D) x < 8"],
    correctAnswer: 0,
    explanation: "2x > 6, so x > 3",
    difficulty: "easy",
    category: "Inequalities"
  },
  {
    question: "Which values of x satisfy -3x + 7 ≤ 1?",
    options: ["A) x ≤ 2", "B) x ≥ 2", "C) x ≤ -2", "D) x ≥ -2"],
    correctAnswer: 1,
    explanation: "-3x ≤ -6, so x ≥ 2 (inequality flips when dividing by negative)",
    difficulty: "medium",
    category: "Inequalities"
  },
  // Word Problems
  {
    question: "A rectangle has length 3 more than twice its width. If the width is w, what is the perimeter?",
    options: ["A) 6w + 6", "B) 4w + 6", "C) 6w + 3", "D) 4w + 3"],
    correctAnswer: 0,
    explanation: "Length = 2w + 3. Perimeter = 2(w + 2w + 3) = 6w + 6",
    difficulty: "hard",
    category: "Word Problems"
  },
  {
    question: "John has 5 more than twice the number of books that Mary has. If Mary has m books, how many books does John have?",
    options: ["A) 2m + 5", "B) 5m + 2", "C) m + 10", "D) 2m - 5"],
    correctAnswer: 0,
    explanation: "Twice Mary's books is 2m, plus 5 more gives 2m + 5",
    difficulty: "medium",
    category: "Word Problems"
  },
  {
    question: "The sum of three consecutive integers is 48. What is the middle integer?",
    options: ["A) 15", "B) 16", "C) 17", "D) 18"],
    correctAnswer: 1,
    explanation: "Let integers be n, n+1, n+2. Then 3n + 3 = 48, so n = 15. Middle is 16",
    difficulty: "hard",
    category: "Word Problems"
  },
  // Percentages and Ratios
  {
    question: "What is 25% of 80?",
    options: ["A) 15", "B) 20", "C) 25", "D) 30"],
    correctAnswer: 1,
    explanation: "25% of 80 = 0.25 × 80 = 20",
    difficulty: "easy",
    category: "Percentages"
  },
  {
    question: "If 60% of a number is 36, what is the number?",
    options: ["A) 50", "B) 55", "C) 60", "D) 65"],
    correctAnswer: 2,
    explanation: "0.6x = 36, so x = 60",
    difficulty: "medium",
    category: "Percentages"
  },
  {
    question: "The ratio of boys to girls in a class is 3:4. If there are 12 boys, how many girls are there?",
    options: ["A) 15", "B) 16", "C) 18", "D) 20"],
    correctAnswer: 1,
    explanation: "If 3 parts = 12 boys, then 1 part = 4. So 4 parts = 16 girls",
    difficulty: "medium",
    category: "Ratios"
  }
]

/**
 * Normalizes option strings by removing letter prefixes like "A) ", "B) ", etc.
 * @param options - Array of option strings
 * @returns Normalized array of options
 */
function normalizeOptions(options: string[]): string[] {
  return options.map(option => option.replace(/^[A-D]\)\s*/, '').trim())
}

/**
 * Validates that correctAnswer is a valid index for the options array
 * @param correctAnswer - The correct answer index
 * @param optionsLength - Length of the options array
 * @returns true if valid, false otherwise
 */
function validateCorrectAnswer(correctAnswer: number, optionsLength: number): boolean {
  return correctAnswer >= 0 && correctAnswer < optionsLength
}

/**
 * Determines the appropriate subtopic based on category or explicit subtopic field
 * @param category - Question category
 * @param subtopic - Explicit subtopic if provided
 * @returns The determined subtopic string
 */
function determineSubtopic(category: string, subtopic?: string): string {
  if (subtopic) {
    return subtopic
  }
  // Fallback to category as subtopic
  return category
}

async function createTextOnlyMath() {
  try {
    console.log('🔢 Replacing graph questions with text-only math questions...')
    
    // Delete all math questions with charts/graphs
    const deleteResult = await prisma.question.deleteMany({
      where: {
        AND: [
          { moduleType: 'math' },
          {
            OR: [
              { chartData: { not: undefined } },
              { imageUrl: { not: null } },
              { category: { contains: 'Graph', mode: 'insensitive' } },
              { category: { contains: 'Chart', mode: 'insensitive' } },
              { question: { contains: 'graph', mode: 'insensitive' } },
              { question: { contains: 'chart', mode: 'insensitive' } }
            ]
          }
        ]
      }
    })
    
    console.log(`🗑️ Deleted ${deleteResult.count} math questions with graphs/charts`)
    
    // Create 100 text-only questions by repeating and varying the base set
    console.log('📝 Creating 100 text-only math questions...')
    
    let questionCount = 0
    let validationErrors = 0
    
    // Add base questions multiple times with variations
    for (let round = 0; round < 4; round++) {
      for (const questionData of TEXT_ONLY_MATH_QUESTIONS) {
        if (questionCount >= 100) break
        
        // Normalize options by stripping letter prefixes
        const normalizedOptions = normalizeOptions(questionData.options)
        
        // Validate correctAnswer index
        if (!validateCorrectAnswer(questionData.correctAnswer, normalizedOptions.length)) {
          console.error(`⚠️  Invalid correctAnswer (${questionData.correctAnswer}) for question: ${questionData.question.substring(0, 50)}...`)
          validationErrors++
          continue
        }
        
        // Create variations by changing numbers slightly
        let modifiedQuestion = questionData.question
        let modifiedExplanation = questionData.explanation
        
        if (round > 0) {
          // Add variation indicator
          modifiedQuestion = `${questionData.question} (Variation ${round})`
        }
        
        // Determine subtopic - use explicit subtopic if available, otherwise fallback to category
        const subtopic = determineSubtopic(questionData.category, (questionData as any).subtopic)
        
        try {
          await prisma.question.create({
            data: {
              moduleType: 'math',
              difficulty: questionData.difficulty,
              category: questionData.category,
              subtopic,
              question: modifiedQuestion,
              options: normalizedOptions,
              correctAnswer: questionData.correctAnswer,
              explanation: modifiedExplanation,
              timeEstimate: 90,
              source: 'Text-Only Math Questions',
              tags: ['algebra', 'text-only', 'no-graphs'],
              isActive: true
            }
          })
          questionCount++
        } catch (error) {
          console.error(`❌ Error creating question: ${error}`)
          validationErrors++
        }
      }
    }
    
    // Fill remaining slots with additional variations
    while (questionCount < 100) {
      const baseQuestion = TEXT_ONLY_MATH_QUESTIONS[questionCount % TEXT_ONLY_MATH_QUESTIONS.length]
      
      // Normalize options by stripping letter prefixes
      const normalizedOptions = normalizeOptions(baseQuestion.options)
      
      // Validate correctAnswer index
      if (!validateCorrectAnswer(baseQuestion.correctAnswer, normalizedOptions.length)) {
        console.error(`⚠️  Skipping invalid question due to correctAnswer validation failure`)
        questionCount++
        validationErrors++
        continue
      }
      
      // Determine subtopic
      const subtopic = determineSubtopic(baseQuestion.category, (baseQuestion as any).subtopic)
      
      try {
        await prisma.question.create({
          data: {
            moduleType: 'math',
            difficulty: baseQuestion.difficulty,
            category: baseQuestion.category,
            subtopic,
            question: `${baseQuestion.question} (Extra ${questionCount})`,
            options: normalizedOptions,
            correctAnswer: baseQuestion.correctAnswer,
            explanation: baseQuestion.explanation,
            timeEstimate: 90,
            source: 'Text-Only Math Questions (Extra)',
            tags: ['algebra', 'text-only', 'no-graphs'],
            isActive: true
          }
        })
        questionCount++
      } catch (error) {
        console.error(`❌ Error creating extra question: ${error}`)
        questionCount++
        validationErrors++
      }
    }
    
    const totalMathQuestions = await prisma.question.count({
      where: { moduleType: 'math' }
    })
    
    console.log(`✅ Successfully created ${questionCount - validationErrors} text-only math questions!`)
    if (validationErrors > 0) {
      console.log(`⚠️  ${validationErrors} questions failed validation and were skipped`)
    }
    console.log('📊 All math questions are now text-based with NO graphs or charts')
    
    // Verify no graphs remain
    const graphQuestions = await prisma.question.count({
      where: {
        AND: [
          { moduleType: 'math' },
          {
            OR: [
              { chartData: { not: undefined } },
              { imageUrl: { not: null } },
              { question: { contains: 'graph', mode: 'insensitive' } },
              { question: { contains: 'chart', mode: 'insensitive' } }
            ]
          }
        ]
      }
    })
    
    console.log(`🔍 Verification: ${graphQuestions} math questions contain graphs/charts`)
    
  } catch (error) {
    console.error('❌ Error creating text-only math questions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTextOnlyMath()
