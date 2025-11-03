#!/usr/bin/env tsx
// Import existing questions from JSON files to database

import { PrismaClient } from '@prisma/client'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

const MATH_FILE = join(process.cwd(), 'generated-math-questions.json')
const READING_FILE = join(process.cwd(), 'generated-reading-questions.json')

interface StoredQuestion {
  id: string
  timestamp: string
  question: string
  passage?: string
  options: string[]
  correctAnswer: number
  points: number
  explanation: string
  moduleType: 'reading-writing' | 'math'
  category: string
  subtopic: string
  difficulty: 'easy' | 'medium' | 'hard'
  qualityScore: number
  chartDescription?: string
  interactionType?: string
  graphType?: string
  evaluationFeedback: string
}

async function importQuestions() {
  console.log('📥 Importing existing questions to database...')

  try {
    let totalImported = 0

    // Import math questions
    if (existsSync(MATH_FILE)) {
      console.log('📊 Importing math questions...')
      const mathContent = readFileSync(MATH_FILE, 'utf-8')
      const mathQuestions: StoredQuestion[] = JSON.parse(mathContent)
      
      for (const q of mathQuestions) {
        try {
          // Find matching subtopic
          const subtopic = await prisma.subtopic.findFirst({
            where: {
              name: {
                contains: q.subtopic,
                mode: 'insensitive'
              }
            }
          })

          await prisma.question.create({
            data: {
              subtopicId: subtopic?.id || null,
              moduleType: q.moduleType,
              difficulty: q.difficulty,
              category: q.category,
              subtopic: q.subtopic,
              question: q.question,
              passage: q.passage || null,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              wrongAnswerExplanations: undefined,
              imageUrl: null,
              imageAlt: q.chartDescription || null,
              chartData: q.chartDescription ? {
                description: q.chartDescription,
                interactionType: q.interactionType || 'point-placement',
                graphType: q.graphType || 'coordinate-plane'
              } : undefined,
              timeEstimate: q.points * 30,
              source: 'AI Generated (GPT-5) - Imported',
              tags: [q.difficulty, q.category, q.subtopic],
              isActive: true
            }
          })

          // Update subtopic count
          if (subtopic) {
            await prisma.subtopic.update({
              where: { id: subtopic.id },
              data: {
                currentCount: {
                  increment: 1
                }
              }
            })
          }

          totalImported++
        } catch (error) {
          console.error(`Failed to import math question: ${q.id}`, error)
        }
      }
      
      console.log(`✅ Imported ${mathQuestions.length} math questions`)
    }

    // Import reading questions
    if (existsSync(READING_FILE)) {
      console.log('📖 Importing reading questions...')
      const readingContent = readFileSync(READING_FILE, 'utf-8')
      const readingQuestions: StoredQuestion[] = JSON.parse(readingContent)
      
      for (const q of readingQuestions) {
        try {
          // Find matching subtopic
          const subtopic = await prisma.subtopic.findFirst({
            where: {
              name: {
                contains: q.subtopic,
                mode: 'insensitive'
              }
            }
          })

          await prisma.question.create({
            data: {
              subtopicId: subtopic?.id || null,
              moduleType: q.moduleType,
              difficulty: q.difficulty,
              category: q.category,
              subtopic: q.subtopic,
              question: q.question,
              passage: q.passage || null,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              wrongAnswerExplanations: undefined,
              imageUrl: undefined,
              imageAlt: undefined,
              chartData: undefined,
              timeEstimate: q.points * 30,
              source: 'AI Generated (GPT-5) - Imported',
              tags: [q.difficulty, q.category, q.subtopic],
              isActive: true
            }
          })

          // Update subtopic count
          if (subtopic) {
            await prisma.subtopic.update({
              where: { id: subtopic.id },
              data: {
                currentCount: {
                  increment: 1
                }
              }
            })
          }

          totalImported++
        } catch (error) {
          console.error(`Failed to import reading question: ${q.id}`, error)
        }
      }
      
      console.log(`✅ Imported ${readingQuestions.length} reading questions`)
    }

    console.log(`\n🎉 Import completed! Total questions imported: ${totalImported}`)
    
    // Show final stats
    const stats = {
      total: await prisma.question.count(),
      math: await prisma.question.count({ where: { moduleType: 'math' } }),
      reading: await prisma.question.count({ where: { moduleType: 'reading-writing' } }),
      byDifficulty: {
        easy: await prisma.question.count({ where: { difficulty: 'easy' } }),
        medium: await prisma.question.count({ where: { difficulty: 'medium' } }),
        hard: await prisma.question.count({ where: { difficulty: 'hard' } })
      }
    }

    console.log('\n📊 Database Statistics:')
    console.log(`   Total questions: ${stats.total}`)
    console.log(`   Math questions: ${stats.math}`)
    console.log(`   Reading questions: ${stats.reading}`)
    console.log(`   Easy: ${stats.byDifficulty.easy}`)
    console.log(`   Medium: ${stats.byDifficulty.medium}`)
    console.log(`   Hard: ${stats.byDifficulty.hard}`)

  } catch (error) {
    console.error('❌ Import failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the import
importQuestions()
