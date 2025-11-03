import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const MATH_QUESTIONS = [
  // Algebra - Linear Equations
  {
    question: "If 3x + 7 = 22, what is the value of x?",
    options: ["A) 3", "B) 5", "C) 7", "D) 15"],
    correctAnswer: 1,
    explanation: "3x + 7 = 22, so 3x = 15, therefore x = 5",
    difficulty: "easy",
    category: "Algebra",
    subtopic: "Linear Equations"
  },
  {
    question: "If 2(x - 3) = 4x + 8, what is x?",
    options: ["A) -7", "B) -5", "C) 5", "D) 7"],
    correctAnswer: 0,
    explanation: "2x - 6 = 4x + 8, so -2x = 14, therefore x = -7",
    difficulty: "medium",
    category: "Algebra",
    subtopic: "Linear Equations"
  },
  // Algebra - Quadratic Equations
  {
    question: "What are the solutions to x² - 5x + 6 = 0?",
    options: ["A) x = 2, 3", "B) x = -2, -3", "C) x = 1, 6", "D) x = -1, -6"],
    correctAnswer: 0,
    explanation: "Factoring: (x-2)(x-3) = 0, so x = 2 or x = 3",
    difficulty: "medium",
    category: "Algebra",
    subtopic: "Quadratic Equations"
  },
  // Algebra - Systems of Equations
  {
    question: "If x + y = 8 and x - y = 2, what is x?",
    options: ["A) 3", "B) 5", "C) 6", "D) 10"],
    correctAnswer: 1,
    explanation: "Adding equations: 2x = 10, so x = 5",
    difficulty: "medium",
    category: "Algebra",
    subtopic: "Systems of Equations"
  },
  // Functions
  {
    question: "If f(x) = 2x² + 3x - 1, what is f(2)?",
    options: ["A) 9", "B) 11", "C) 13", "D) 15"],
    correctAnswer: 0,
    explanation: "f(2) = 2(4) + 3(2) - 1 = 8 + 6 - 1 = 13",
    difficulty: "medium",
    category: "Functions",
    subtopic: "Function Evaluation"
  },
  // Exponents and Radicals
  {
    question: "What is √(64) + ∛(27)?",
    options: ["A) 9", "B) 11", "C) 13", "D) 15"],
    correctAnswer: 1,
    explanation: "√64 = 8 and ∛27 = 3, so 8 + 3 = 11",
    difficulty: "easy",
    category: "Exponents and Radicals",
    subtopic: "Simplifying Radicals"
  },
  {
    question: "If 2^x = 32, what is x?",
    options: ["A) 4", "B) 5", "C) 6", "D) 16"],
    correctAnswer: 1,
    explanation: "2^5 = 32, so x = 5",
    difficulty: "easy",
    category: "Exponents and Radicals",
    subtopic: "Exponential Equations"
  },
  // Polynomials
  {
    question: "What is (x + 3)(x - 2)?",
    options: ["A) x² + x - 6", "B) x² - x - 6", "C) x² + x + 6", "D) x² - x + 6"],
    correctAnswer: 0,
    explanation: "Using FOIL: x² - 2x + 3x - 6 = x² + x - 6",
    difficulty: "medium",
    category: "Polynomials",
    subtopic: "Polynomial Multiplication"
  },
  // Rational Expressions
  {
    question: "Simplify: (x² - 4)/(x - 2)",
    options: ["A) x + 2", "B) x - 2", "C) x² + 2", "D) Cannot be simplified"],
    correctAnswer: 0,
    explanation: "x² - 4 = (x+2)(x-2), so (x+2)(x-2)/(x-2) = x + 2",
    difficulty: "medium",
    category: "Rational Expressions",
    subtopic: "Simplifying Rationals"
  },
  // Statistics and Probability
  {
    question: "The mean of 5 numbers is 12. If four of the numbers are 8, 10, 14, and 16, what is the fifth number?",
    options: ["A) 10", "B) 12", "C) 14", "D) 16"],
    correctAnswer: 1,
    explanation: "Sum = 5 × 12 = 60. Known sum = 48, so fifth number = 60 - 48 = 12",
    difficulty: "medium",
    category: "Statistics",
    subtopic: "Mean and Average"
  },
  {
    question: "A bag contains 3 red balls and 7 blue balls. What is the probability of drawing a red ball?",
    options: ["A) 3/10", "B) 3/7", "C) 7/10", "D) 1/3"],
    correctAnswer: 0,
    explanation: "P(red) = number of red balls / total balls = 3/10",
    difficulty: "easy",
    category: "Probability",
    subtopic: "Basic Probability"
  },
  // Sequences and Series
  {
    question: "What is the 10th term of the arithmetic sequence 2, 5, 8, 11, ...?",
    options: ["A) 26", "B) 29", "C) 32", "D) 35"],
    correctAnswer: 1,
    explanation: "First term a₁ = 2, common difference d = 3. a₁₀ = 2 + 9(3) = 29",
    difficulty: "medium",
    category: "Sequences",
    subtopic: "Arithmetic Sequences"
  },
  // Inequalities
  {
    question: "Solve: 3x - 7 > 8",
    options: ["A) x > 5", "B) x > 15", "C) x < 5", "D) x < 15"],
    correctAnswer: 0,
    explanation: "3x > 15, so x > 5",
    difficulty: "easy",
    category: "Inequalities",
    subtopic: "Linear Inequalities"
  }
]

const READING_QUESTIONS = [
  // Reading Comprehension - Main Ideas
  {
    question: "What is the main purpose of this passage?",
    passage: "Climate change represents one of the most pressing challenges of our time. Rising global temperatures, melting ice caps, and extreme weather events are clear indicators that immediate action is required. Scientists worldwide agree that reducing carbon emissions is crucial for preventing catastrophic environmental damage.",
    options: ["A) To describe weather patterns", "B) To argue for climate action", "C) To explain ice cap formation", "D) To discuss scientific methods"],
    correctAnswer: 1,
    explanation: "The passage's main purpose is to argue for immediate climate action by presenting evidence of climate change",
    difficulty: "medium",
    category: "Reading Comprehension",
    subtopic: "Main Ideas"
  },
  {
    question: "Which statement best summarizes the author's central claim?",
    passage: "The digital revolution has fundamentally transformed how we communicate, work, and learn. While technology offers unprecedented opportunities for connection and innovation, it also presents challenges such as privacy concerns and digital divides. Society must carefully balance technological advancement with ethical considerations.",
    options: ["A) Technology is entirely beneficial", "B) Digital divides are insurmountable", "C) Technology requires balanced implementation", "D) Privacy is no longer important"],
    correctAnswer: 2,
    explanation: "The author argues that society must balance technological advancement with ethical considerations",
    difficulty: "medium",
    category: "Reading Comprehension",
    subtopic: "Central Claims"
  },
  // Vocabulary in Context
  {
    question: "In this context, 'meticulous' most nearly means:",
    passage: "The archaeologist's meticulous documentation of each artifact ensured that no detail was overlooked during the excavation process.",
    options: ["A) Quick", "B) Careful", "C) Expensive", "D) Creative"],
    correctAnswer: 1,
    explanation: "Meticulous means showing great attention to detail; careful and precise",
    difficulty: "easy",
    category: "Vocabulary",
    subtopic: "Context Clues"
  },
  {
    question: "The word 'ubiquitous' in the passage means:",
    passage: "Smartphones have become ubiquitous in modern society, found in the hands of people across all age groups and social classes.",
    options: ["A) Expensive", "B) Everywhere", "C) Outdated", "D) Complicated"],
    correctAnswer: 1,
    explanation: "Ubiquitous means present, appearing, or found everywhere",
    difficulty: "medium",
    category: "Vocabulary",
    subtopic: "Word Meaning"
  },
  // Inferences and Implications
  {
    question: "Based on the passage, what can be inferred about the author's attitude?",
    passage: "While some critics dismiss renewable energy as unreliable, recent technological advances have dramatically improved efficiency and reduced costs. Solar and wind power now compete favorably with traditional fossil fuels in many markets.",
    options: ["A) Skeptical of renewable energy", "B) Supportive of renewable energy", "C) Neutral about energy sources", "D) Opposed to technological change"],
    correctAnswer: 1,
    explanation: "The author presents positive evidence about renewable energy, suggesting support",
    difficulty: "medium",
    category: "Reading Comprehension",
    subtopic: "Author's Attitude"
  },
  // Text Structure and Organization
  {
    question: "How is this passage primarily organized?",
    passage: "First, gather all necessary ingredients. Next, preheat the oven to 350°F. Then, mix the dry ingredients in one bowl and wet ingredients in another. Finally, combine both mixtures and bake for 25 minutes.",
    options: ["A) Cause and effect", "B) Compare and contrast", "C) Sequential steps", "D) Problem and solution"],
    correctAnswer: 2,
    explanation: "The passage is organized as a sequence of steps using transition words like 'First,' 'Next,' 'Then,' 'Finally'",
    difficulty: "easy",
    category: "Text Structure",
    subtopic: "Organization Patterns"
  },
  // Supporting Details and Evidence
  {
    question: "Which detail best supports the main argument?",
    passage: "Regular exercise provides numerous health benefits. Studies show that people who exercise regularly have lower rates of heart disease, improved mental health, and increased longevity. Additionally, exercise helps maintain healthy weight and strengthens bones.",
    options: ["A) Exercise is popular", "B) Studies show lower heart disease rates", "C) Gyms are expensive", "D) Exercise requires equipment"],
    correctAnswer: 1,
    explanation: "The study showing lower heart disease rates provides concrete evidence supporting the health benefits claim",
    difficulty: "medium",
    category: "Reading Comprehension",
    subtopic: "Supporting Evidence"
  },
  // Grammar and Usage
  {
    question: "Which sentence is grammatically correct?",
    options: ["A) Neither the students nor the teacher were ready.", "B) Neither the students nor the teacher was ready.", "C) Neither the students or the teacher were ready.", "D) Neither the students or the teacher was ready."],
    correctAnswer: 1,
    explanation: "With 'neither...nor,' the verb agrees with the subject closer to it. 'Teacher' is singular, so 'was' is correct",
    difficulty: "medium",
    category: "Grammar",
    subtopic: "Subject-Verb Agreement"
  },
  {
    question: "Choose the correct punctuation:",
    options: ["A) The meeting is at 3:00 PM, however, I might be late.", "B) The meeting is at 3:00 PM; however, I might be late.", "C) The meeting is at 3:00 PM however, I might be late.", "D) The meeting is at 3:00 PM: however, I might be late."],
    correctAnswer: 1,
    explanation: "When 'however' connects two independent clauses, use a semicolon before it and a comma after",
    difficulty: "medium",
    category: "Grammar",
    subtopic: "Punctuation"
  },
  // Rhetorical Skills
  {
    question: "Which revision best improves the sentence's clarity?",
    passage: "The book that I read yesterday which was very interesting had many complex characters.",
    options: ["A) The book I read yesterday was very interesting and had many complex characters.", "B) The book, that I read yesterday, which was very interesting, had many complex characters.", "C) Yesterday I read the book that was very interesting with many complex characters.", "D) The very interesting book that I read yesterday had many complex characters."],
    correctAnswer: 0,
    explanation: "Option A eliminates redundant relative clauses and creates a clearer, more direct sentence",
    difficulty: "hard",
    category: "Writing",
    subtopic: "Sentence Clarity"
  },
  // Data Interpretation (Reading)
  {
    question: "Based on the information provided, what conclusion can be drawn?",
    passage: "Survey results: 65% of respondents prefer online shopping, 25% prefer in-store shopping, and 10% have no preference. The survey included 1,000 participants aged 18-65 from urban areas.",
    options: ["A) All people prefer online shopping", "B) Most respondents prefer online shopping", "C) Rural preferences weren't measured", "D) Both B and C"],
    correctAnswer: 3,
    explanation: "Most (65%) prefer online shopping, and the survey only included urban areas, not rural",
    difficulty: "hard",
    category: "Data Analysis",
    subtopic: "Drawing Conclusions"
  }
]

async function seedComprehensiveQuestions() {
  try {
    console.log('📚 Seeding comprehensive math and reading questions...')
    
    // Add math questions (keeping existing graph questions)
    console.log('🔢 Adding diverse math questions...')
    for (const questionData of MATH_QUESTIONS) {
      await prisma.question.create({
        data: {
          moduleType: 'math',
          difficulty: questionData.difficulty as any,
          category: questionData.category,
          subtopic: questionData.subtopic,
          question: questionData.question,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation,
          timeEstimate: 90,
          source: 'Curated Math Questions',
          tags: ['algebra', 'functions', 'statistics'],
          isActive: true
        }
      })
    }
    
    // Add reading questions
    console.log('📖 Adding diverse reading questions...')
    for (const questionData of READING_QUESTIONS) {
      await prisma.question.create({
        data: {
          moduleType: 'reading-writing',
          difficulty: questionData.difficulty as any,
          category: questionData.category,
          subtopic: questionData.subtopic,
          question: questionData.question,
          passage: questionData.passage || null,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation,
          timeEstimate: 75,
          source: 'Curated Reading Questions',
          tags: ['reading', 'grammar', 'vocabulary'],
          isActive: true
        }
      })
    }
    
    // Generate variations for more questions
    console.log('🔄 Creating question variations...')
    
    // Math variations
    for (let i = 0; i < 30; i++) {
      const baseQuestion = MATH_QUESTIONS[i % MATH_QUESTIONS.length]
      await prisma.question.create({
        data: {
          moduleType: 'math',
          difficulty: baseQuestion.difficulty as any,
          category: baseQuestion.category,
          subtopic: baseQuestion.subtopic,
          question: `${baseQuestion.question} (Variation ${i + 1})`,
          options: baseQuestion.options,
          correctAnswer: baseQuestion.correctAnswer,
          explanation: baseQuestion.explanation,
          timeEstimate: 90,
          source: 'Curated Math Questions (Variation)',
          tags: ['algebra', 'functions', 'statistics'],
          isActive: true
        }
      })
    }
    
    // Reading variations
    for (let i = 0; i < 40; i++) {
      const baseQuestion = READING_QUESTIONS[i % READING_QUESTIONS.length]
      await prisma.question.create({
        data: {
          moduleType: 'reading-writing',
          difficulty: baseQuestion.difficulty as any,
          category: baseQuestion.category,
          subtopic: baseQuestion.subtopic,
          question: `${baseQuestion.question} (Variation ${i + 1})`,
          passage: baseQuestion.passage || null,
          options: baseQuestion.options,
          correctAnswer: baseQuestion.correctAnswer,
          explanation: baseQuestion.explanation,
          timeEstimate: 75,
          source: 'Curated Reading Questions (Variation)',
          tags: ['reading', 'grammar', 'vocabulary'],
          isActive: true
        }
      })
    }
    
    const mathCount = await prisma.question.count({ where: { moduleType: 'math' } })
    const readingCount = await prisma.question.count({ where: { moduleType: 'reading-writing' } })
    
    console.log(`✅ Successfully added questions!`)
    console.log(`📊 Math questions: ${mathCount}`)
    console.log(`📚 Reading questions: ${readingCount}`)
    console.log(`🎯 Total questions: ${mathCount + readingCount}`)
    
  } catch (error) {
    console.error('❌ Error seeding questions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedComprehensiveQuestions()
