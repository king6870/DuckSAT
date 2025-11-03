#!/usr/bin/env tsx
// Test script for AI question generation with file storage

import { aiQuestionService } from '../src/services/aiQuestionService'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

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

const MATH_FILE = join(process.cwd(), 'generated-math-questions.json')
const READING_FILE = join(process.cwd(), 'generated-reading-questions.json')

function loadExistingQuestions(filePath: string): StoredQuestion[] {
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.log(`Could not load existing questions from ${filePath}, starting fresh`)
      return []
    }
  }
  return []
}

function saveQuestions(questions: StoredQuestion[], filePath: string) {
  try {
    writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf-8')
    console.log(`✅ Saved ${questions.length} questions to ${filePath}`)
  } catch (error) {
    console.error(`❌ Failed to save questions to ${filePath}:`, error)
  }
}

function generateQuestionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

async function testGeneration() {
  console.log('🚀 Testing AI Question Generation System')
  console.log('=====================================')
  
  try {
    // Step 1: Generate questions with GPT-5
    console.log('\n📝 Step 1: Generating questions with GPT-5...')
    const generatedQuestions = await aiQuestionService.generateQuestions()
    
    console.log(`✅ Generated ${generatedQuestions.length} questions`)
    console.log(`   - Math questions: ${generatedQuestions.filter(q => q.moduleType === 'math').length}`)
    console.log(`   - Reading questions: ${generatedQuestions.filter(q => q.moduleType === 'reading-writing').length}`)
    
    // Step 2: Evaluate with Grok
    console.log('\n🔍 Step 2: Evaluating questions with Grok...')
    const evaluatedQuestions = await aiQuestionService.evaluateQuestions(generatedQuestions)
    
    const accepted = evaluatedQuestions.filter(q => q.isAccepted)
    const rejected = evaluatedQuestions.filter(q => !q.isAccepted)
    
    console.log(`✅ Evaluation complete:`)
    console.log(`   - Accepted: ${accepted.length}`)
    console.log(`   - Rejected: ${rejected.length}`)
    
    // Step 3: Load existing questions
    console.log('\n📂 Step 3: Loading existing questions...')
    const existingMathQuestions = loadExistingQuestions(MATH_FILE)
    const existingReadingQuestions = loadExistingQuestions(READING_FILE)
    
    console.log(`   - Existing math questions: ${existingMathQuestions.length}`)
    console.log(`   - Existing reading questions: ${existingReadingQuestions.length}`)
    
    // Step 4: Process and store new questions
    console.log('\n💾 Step 4: Storing new questions...')
    const timestamp = new Date().toISOString()
    
    const newMathQuestions: StoredQuestion[] = []
    const newReadingQuestions: StoredQuestion[] = []
    
    for (const question of accepted) {
      const storedQuestion: StoredQuestion = {
        id: generateQuestionId(),
        timestamp,
        question: question.question,
        passage: question.passage,
        options: question.options,
        correctAnswer: question.correctAnswer,
        points: question.points,
        explanation: question.explanation,
        moduleType: question.moduleType,
        category: question.category,
        subtopic: question.subtopic,
        difficulty: question.difficulty,
        qualityScore: question.qualityScore,
        chartDescription: question.chartDescription,
        interactionType: question.interactionType,
        graphType: question.graphType,
        evaluationFeedback: question.evaluationFeedback
      }
      
      if (question.moduleType === 'math') {
        newMathQuestions.push(storedQuestion)
      } else {
        newReadingQuestions.push(storedQuestion)
      }
    }
    
    // Append to existing questions
    const allMathQuestions = [...existingMathQuestions, ...newMathQuestions]
    const allReadingQuestions = [...existingReadingQuestions, ...newReadingQuestions]
    
    // Save to files
    if (newMathQuestions.length > 0) {
      saveQuestions(allMathQuestions, MATH_FILE)
    }
    if (newReadingQuestions.length > 0) {
      saveQuestions(allReadingQuestions, READING_FILE)
    }
    
    // Step 5: Show detailed results
    console.log('\n📊 Results Summary:')
    console.log('==================')
    console.log(`📁 Files:`)
    console.log(`   - Math questions file: ${MATH_FILE}`)
    console.log(`   - Reading questions file: ${READING_FILE}`)
    console.log(`📈 Totals:`)
    console.log(`   - Total math questions: ${allMathQuestions.length}`)
    console.log(`   - Total reading questions: ${allReadingQuestions.length}`)
    console.log(`   - New math questions: ${newMathQuestions.length}`)
    console.log(`   - New reading questions: ${newReadingQuestions.length}`)
    
    if (accepted.length > 0) {
      console.log('\n✅ NEW ACCEPTED QUESTIONS:')
      console.log('==========================')
      
      accepted.forEach((q, i) => {
        console.log(`\n${i + 1}. [${q.moduleType.toUpperCase()}] ${q.subtopic} (${q.difficulty})`)
        console.log(`   Points: ${q.points} | Quality: ${(q.qualityScore * 100).toFixed(0)}%`)
        console.log(`   Category: ${q.category}`)
        
        if (q.passage) {
          console.log(`\n   📖 PASSAGE:`)
          console.log(`   ${q.passage}`)
        }
        
        if (q.chartDescription) {
          console.log(`\n   📊 INTERACTIVE GRAPH:`)
          console.log(`   Type: ${q.graphType || 'coordinate-plane'}`)
          console.log(`   Interaction: ${q.interactionType || 'point-placement'}`)
          console.log(`   Description: ${q.chartDescription}`)
        }
        
        console.log(`\n   ❓ QUESTION:`)
        console.log(`   ${q.question}`)
        
        console.log(`\n   📝 OPTIONS:`)
        q.options.forEach((option, optIndex) => {
          const marker = optIndex === q.correctAnswer ? '✓' : ' '
          console.log(`   ${marker} ${option}`)
        })
        
        console.log(`\n   💡 EXPLANATION:`)
        console.log(`   ${q.explanation}`)
        
        console.log(`\n   🔍 EVALUATION:`)
        console.log(`   ${q.evaluationFeedback}`)
        
        console.log(`\n   ${'='.repeat(80)}`)
      })
    }
    
    if (rejected.length > 0) {
      console.log('\n❌ REJECTED QUESTIONS:')
      console.log('======================')
      rejected.forEach((q, i) => {
        console.log(`\n${i + 1}. [${q.moduleType.toUpperCase()}] ${q.subtopic}`)
        console.log(`   Question: ${q.question.substring(0, 100)}...`)
        console.log(`   Reason: ${q.evaluationFeedback}`)
      })
    }
    
    console.log('\n🎉 Test completed successfully!')
    console.log(`📁 Check the generated files:`)
    console.log(`   - ${MATH_FILE}`)
    console.log(`   - ${READING_FILE}`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testGeneration()
