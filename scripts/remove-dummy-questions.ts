import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DUMMY_TAG = 'DUMMY_QUESTION_REMOVABLE'

async function main() {
  console.log('🗑️  Starting removal of dummy questions...')
  console.log(`🔍 Looking for questions with tag: ${DUMMY_TAG}`)

  // Count questions to be removed
  const count = await prisma.question.count({
    where: {
      tags: {
        has: DUMMY_TAG,
      },
    },
  })

  console.log(`📊 Found ${count} dummy questions to remove`)

  if (count === 0) {
    console.log('✅ No dummy questions found. Nothing to remove.')
    return
  }

  // Ask for confirmation
  console.log(`\n⚠️  This will permanently delete ${count} questions.`)
  console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...')
  
  await new Promise(resolve => setTimeout(resolve, 3000))

  // Delete the questions
  const result = await prisma.question.deleteMany({
    where: {
      tags: {
        has: DUMMY_TAG,
      },
    },
  })

  console.log(`\n✅ Successfully removed ${result.count} dummy questions!`)
}

main()
  .catch((e) => {
    console.error('❌ Error removing dummy questions:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
