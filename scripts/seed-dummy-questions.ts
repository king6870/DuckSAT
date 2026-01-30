import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DUMMY_TAG = 'DUMMY_QUESTION_REMOVABLE'

// Math question templates
const mathCategories = [
  { category: 'algebra', subtopic: 'linear-equations' },
  { category: 'algebra', subtopic: 'quadratic-functions' },
  { category: 'geometry', subtopic: 'area-perimeter' },
  { category: 'geometry', subtopic: 'triangles' },
  { category: 'data-analysis', subtopic: 'statistics' },
  { category: 'data-analysis', subtopic: 'probability' },
  { category: 'advanced-math', subtopic: 'polynomials' },
  { category: 'advanced-math', subtopic: 'exponents' },
]

// Reading question templates
const readingCategories = [
  { category: 'reading-comprehension', subtopic: 'main-ideas' },
  { category: 'reading-comprehension', subtopic: 'details' },
  { category: 'vocabulary', subtopic: 'context-clues' },
  { category: 'vocabulary', subtopic: 'word-choice' },
  { category: 'rhetoric', subtopic: 'purpose' },
  { category: 'rhetoric', subtopic: 'structure' },
  { category: 'synthesis', subtopic: 'multiple-texts' },
  { category: 'command-of-evidence', subtopic: 'textual-support' },
]

const difficulties = ['easy', 'medium', 'hard']

function generateMathQuestion(index: number): any {
  const categoryInfo = mathCategories[index % mathCategories.length]
  const difficulty = difficulties[index % 3]
  const num1 = Math.floor(Math.random() * 50) + 1
  const num2 = Math.floor(Math.random() * 50) + 1
  const correctAnswer = num1 + num2

  return {
    moduleType: 'math',
    difficulty,
    category: categoryInfo.category,
    subtopic: categoryInfo.subtopic,
    question: `What is the value of ${num1} + ${num2}?`,
    passage: null,
    options: JSON.stringify([
      correctAnswer.toString(),
      (correctAnswer + 1).toString(),
      (correctAnswer - 1).toString(),
      (correctAnswer + 5).toString(),
    ]),
    correctAnswer: 0,
    explanation: `To solve ${num1} + ${num2}, we simply add the two numbers: ${num1} + ${num2} = ${correctAnswer}. This is a basic arithmetic operation demonstrating the addition of positive integers.`,
    wrongAnswerExplanations: JSON.stringify({
      1: `This answer (${correctAnswer + 1}) is incorrect because it adds 1 extra to the correct sum.`,
      2: `This answer (${correctAnswer - 1}) is incorrect because it subtracts 1 from the correct sum.`,
      3: `This answer (${correctAnswer + 5}) is incorrect because it adds 5 extra to the correct sum.`,
    }),
    imageUrl: null,
    imageData: null,
    imageMimeType: null,
    imageAlt: null,
    chartData: null,
    timeEstimate: difficulty === 'easy' ? 60 : difficulty === 'medium' ? 90 : 120,
    source: 'DuckSAT Practice Generator',
    tags: [DUMMY_TAG, 'practice', 'auto-generated'],
    isActive: true,
    reviewStatus: 'approved',
    reviewRating: 4,
    diagramAccurate: null,
    reviewComments: 'Auto-generated practice question',
    reviewedBy: 'system',
    reviewedAt: new Date(),
  }
}

function generateReadingQuestion(index: number): any {
  const categoryInfo = readingCategories[index % readingCategories.length]
  const difficulty = difficulties[index % 3]
  const topics = [
    'climate change',
    'technological innovation',
    'historical events',
    'literary analysis',
    'scientific discovery',
    'social movements',
    'economic theory',
    'cultural traditions',
  ]
  const topic = topics[index % topics.length]

  return {
    moduleType: 'reading-writing',
    difficulty,
    category: categoryInfo.category,
    subtopic: categoryInfo.subtopic,
    question: `Based on the passage, what is the author's primary purpose in discussing ${topic}?`,
    passage: `The study of ${topic} has revealed significant insights into modern society. Recent research demonstrates that understanding ${topic} is crucial for addressing contemporary challenges. Experts in the field have observed that ${topic} influences various aspects of daily life, from individual decision-making to broader societal trends. This phenomenon continues to shape our world in meaningful ways, prompting scholars to investigate its implications more thoroughly. The complexity of ${topic} requires careful analysis and consideration of multiple perspectives to fully appreciate its impact on our collective future.`,
    options: JSON.stringify([
      `To explain the significance and impact of ${topic} on modern society`,
      `To criticize current approaches to ${topic}`,
      `To propose a new theory about ${topic}`,
      `To dismiss the importance of ${topic}`,
    ]),
    correctAnswer: 0,
    explanation: `The correct answer is A. The passage primarily focuses on explaining how ${topic} reveals insights and influences society. The author discusses research findings and expert observations to demonstrate the significance of ${topic}, which aligns with explaining its impact on modern society.`,
    wrongAnswerExplanations: JSON.stringify({
      1: `This is incorrect because the passage does not criticize current approaches; instead, it presents research findings in a neutral, informative manner.`,
      2: `This is incorrect because the passage does not propose a new theory; it discusses existing research and observations about ${topic}.`,
      3: `This is incorrect because the passage emphasizes the importance of ${topic} rather than dismissing it.`,
    }),
    imageUrl: null,
    imageData: null,
    imageMimeType: null,
    imageAlt: null,
    chartData: null,
    timeEstimate: difficulty === 'easy' ? 75 : difficulty === 'medium' ? 105 : 135,
    source: 'DuckSAT Practice Generator',
    tags: [DUMMY_TAG, 'practice', 'auto-generated'],
    isActive: true,
    reviewStatus: 'approved',
    reviewRating: 4,
    diagramAccurate: null,
    reviewComments: 'Auto-generated practice question',
    reviewedBy: 'system',
    reviewedAt: new Date(),
  }
}

async function main() {
  console.log('🚀 Starting dummy question seeding...')
  console.log(`📌 Tag for removal: ${DUMMY_TAG}`)

  const questions = []

  // Generate 250 math questions
  console.log('📊 Generating 250 math questions...')
  for (let i = 0; i < 250; i++) {
    questions.push(generateMathQuestion(i))
  }

  // Generate 250 reading questions
  console.log('📖 Generating 250 reading questions...')
  for (let i = 0; i < 250; i++) {
    questions.push(generateReadingQuestion(i))
  }

  // Insert questions in batches to avoid overwhelming the database
  console.log('💾 Inserting questions into database...')
  const batchSize = 50
  let inserted = 0

  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize)
    await prisma.question.createMany({
      data: batch,
      skipDuplicates: true,
    })
    inserted += batch.length
    console.log(`   ✓ Inserted ${inserted}/${questions.length} questions`)
  }

  console.log(`\n✅ Successfully seeded ${questions.length} dummy questions!`)
  console.log(`📝 To remove these questions later, run:`)
  console.log(`   npx tsx scripts/remove-dummy-questions.ts`)
  console.log(`\n📊 Distribution:`)
  console.log(`   - Math questions: 250`)
  console.log(`   - Reading questions: 250`)
  console.log(`   - Tag: ${DUMMY_TAG}`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding dummy questions:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
