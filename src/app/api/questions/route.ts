import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const moduleType = searchParams.get('moduleType') || 'reading-writing'
    const limit = parseInt(searchParams.get('limit') || '27')

    console.log(`Fetching ${limit} questions for moduleType: ${moduleType}`)

    // Get questions with better distribution across difficulties and categories
    const questions = await prisma.question.findMany({
      where: {
        isActive: true,
        moduleType
      },
      take: limit * 2, // Get more questions to allow for better selection
      orderBy: [
        { difficulty: 'asc' },
        { category: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    console.log(`Found ${questions.length} total questions for ${moduleType}`, questions)

    // Distribute questions across difficulties for better test balance
    const easyQuestions = questions.filter(q => q.difficulty === 'easy')
    const mediumQuestions = questions.filter(q => q.difficulty === 'medium')
    const hardQuestions = questions.filter(q => q.difficulty === 'hard')

    // SAT-like distribution: ~40% easy, 40% medium, 20% hard
    const easyCount = Math.floor(limit * 0.4)
    const mediumCount = Math.floor(limit * 0.4)
    const hardCount = limit - easyCount - mediumCount

    const selectedQuestions = [
      ...easyQuestions.slice(0, easyCount),
      ...mediumQuestions.slice(0, mediumCount),
      ...hardQuestions.slice(0, hardCount)
    ]

    // If we don't have enough questions in specific difficulties, fill with available ones
    while (selectedQuestions.length < limit && questions.length > selectedQuestions.length) {
      const remaining = questions.filter(q => !selectedQuestions.includes(q))
      if (remaining.length > 0) {
        selectedQuestions.push(remaining[0])
      } else {
        break
      }
    }

    // Shuffle the selected questions for variety
    const shuffledQuestions = selectedQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)

    console.log(`Returning ${shuffledQuestions.length} questions with distribution:`, {
      easy: shuffledQuestions.filter(q => q.difficulty === 'easy').length,
      medium: shuffledQuestions.filter(q => q.difficulty === 'medium').length,
      hard: shuffledQuestions.filter(q => q.difficulty === 'hard').length
    })

    return NextResponse.json(shuffledQuestions.map(q => ({
      id: q.id,
      moduleType: q.moduleType,
      difficulty: q.difficulty,
      category: q.category,
      subtopic: q.subtopic,
      question: q.question,
      passage: q.passage,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      wrongAnswerExplanations: q.wrongAnswerExplanations || {},
      imageUrl: q.imageUrl,
      imageAlt: q.imageAlt,
      chartData: q.chartData,
      timeEstimate: q.timeEstimate || 90,
      source: q.source,
      tags: q.tags || []
    })))
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }
}
