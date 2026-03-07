import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface QuestionInput {
  question: string
  passage?: string | null
  options: string[]
  correctAnswer: number | string
  explanation?: string
  wrongAnswerExplanations?: Record<string, string> | null
  moduleType: 'reading-writing' | 'math'
  category?: string
  topic?: string
  subtopic?: string | null
  difficulty?: string
  difficultyScore?: number | null
  visualType?: string | null
}

interface ExistingQuestionRow {
  id: string
}

const PRACTICE_TEST_IDS = [
  'SAT_PRACTICE_TEST_1_ID',
  'SAT_PRACTICE_TEST_2_ID'
]

const batchDir = path.join(__dirname, '../generated-batches')
const batchFiles = fs.readdirSync(batchDir).filter(f => f.endsWith('.json'))

let uniqueQuestions: QuestionInput[] = []
for (const file of batchFiles) {
  const questions = JSON.parse(fs.readFileSync(path.join(batchDir, file), 'utf8')) as QuestionInput[]
  uniqueQuestions = uniqueQuestions.concat(questions)
}

uniqueQuestions = uniqueQuestions.filter(
  (q, idx, arr) => arr.findIndex(x => x.question === q.question) === idx
)

const assignedQuestions = new Set<string>()

function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

function toCorrectAnswerIndex(question: QuestionInput): number {
  const answer = question.correctAnswer
  if (typeof answer === 'number') return answer
  if (Array.isArray(question.options) && typeof answer === 'string') {
    const idx = question.options.indexOf(answer)
    return idx >= 0 ? idx : 0
  }
  return 0
}

async function findOrCreateQuestion(input: QuestionInput): Promise<string> {
  const dbResult = await prisma.$queryRaw<ExistingQuestionRow[]>`
    SELECT TOP 1 [id]
    FROM [questions]
    WHERE CAST([question] AS NVARCHAR(MAX)) = ${input.question}
  `

  if (!dbResult || dbResult.length === 0) {
    const created = await prisma.question.create({
      data: {
        question: input.question,
        passage: input.passage ?? null,
        options: JSON.stringify(input.options ?? []),
        correctAnswer: toCorrectAnswerIndex(input),
        explanation: input.explanation ?? '',
        wrongAnswerExplanations: input.wrongAnswerExplanations
          ? JSON.stringify(input.wrongAnswerExplanations)
          : null,
        moduleType: input.moduleType,
        category: input.category ?? input.topic ?? '',
        subtopic: input.subtopic ?? null,
        difficulty: input.difficulty ?? '',
        difficultyScore: input.difficultyScore ?? null,
        visualType: input.visualType ?? null,
        timeEstimate: 75,
        tags: JSON.stringify([]),
        isActive: true,
        isReserved: true
      }
    })
    return created.id
  }

  return dbResult[0].id
}

async function main() {
  for (const testId of PRACTICE_TEST_IDS) {
    console.log(`[Assignment] Processing practice test: ${testId}`)

    await prisma.practiceTestQuestion.deleteMany({ where: { practiceTestId: testId } })
    console.log(`[Assignment] Cleared previous assignments for practice test: ${testId}`)

    const availableQuestions = uniqueQuestions.filter(q => !assignedQuestions.has(q.question))
    console.log(`[Assignment] Available questions for ${testId}: ${availableQuestions.length}`)

    if (availableQuestions.length < 98) {
      throw new Error(
        `Not enough unique questions left for test ${testId}. Needed: 98, Found: ${availableQuestions.length}`
      )
    }

    const shuffledQuestions = shuffle(availableQuestions)
    const module1Questions = shuffledQuestions.slice(0, 49)
    const module2Questions = shuffledQuestions.slice(49, 98)

    const module1Set = new Set(module1Questions.map(q => q.question))
    const module2Set = new Set(module2Questions.map(q => q.question))
    const overlap = [...module1Set].filter(q => module2Set.has(q))

    if (overlap.length > 0) {
      throw new Error(`Duplicate questions found between modules for test ${testId}`)
    }

    for (let i = 0; i < 49; i++) {
      try {
        const module2QuestionId = await findOrCreateQuestion(module1Questions[i])
        await prisma.practiceTestQuestion.create({
          data: {
            practiceTestId: testId,
            questionId: module2QuestionId,
            moduleIndex: 2,
            orderIndex: i + 1
          }
        })
      } catch (err) {
        console.error(
          `[Assignment] Error assigning question to test ${testId} (module 2, order ${i + 1}):`,
          err
        )
      }

      try {
        const module0QuestionId = await findOrCreateQuestion(module2Questions[i])
        await prisma.practiceTestQuestion.create({
          data: {
            practiceTestId: testId,
            questionId: module0QuestionId,
            moduleIndex: 0,
            orderIndex: i + 50
          }
        })
      } catch (err) {
        console.error(
          `[Assignment] Error assigning question to test ${testId} (module 0, order ${i + 50}):`,
          err
        )
      }
    }

    for (const q of module1Questions) assignedQuestions.add(q.question)
    for (const q of module2Questions) assignedQuestions.add(q.question)
  }

  console.log('[Assignment] Practice tests updated with fully unique questions per module and no repeats across tests.')
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
