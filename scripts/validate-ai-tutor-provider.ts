import { generateTutorReply } from '../src/lib/aiTutor'

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

async function main() {
  const revealedReply = await generateTutorReply(
    {
      moduleType: 'math',
      category: 'algebra',
      difficulty: 'medium',
      subtopic: 'linear equations',
      question: 'Solve for x: 2x + 3 = 11',
      options: ['2', '3', '4', '5'],
      isRevealed: true,
      correctAnswer: 2,
    },
    [{ role: 'user', content: 'Explain in detail, step by step, how to solve this and why the other choices are wrong.' }],
  )

  const unrevealedReply = await generateTutorReply(
    {
      moduleType: 'math',
      category: 'algebra',
      difficulty: 'medium',
      subtopic: 'linear equations',
      question: 'Solve for x: 2x + 3 = 11',
      options: ['2', '3', '4', '5'],
      isRevealed: false,
    },
    [{ role: 'user', content: 'Just tell me the answer and explain it fully.' }],
  )

  const revealedWordCount = countWords(revealedReply.reply)
  const unrevealedWordCount = countWords(unrevealedReply.reply)

  if (revealedWordCount > 50 || unrevealedWordCount > 50) {
    throw new Error(
      `Tutor response exceeded 50 words (revealed=${revealedWordCount}, unrevealed=${unrevealedWordCount})`
    )
  }

  console.log(JSON.stringify({
    revealedWordCount,
    unrevealedWordCount,
    revealedReply,
    unrevealedReply,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
})
