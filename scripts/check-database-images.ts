#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma'

async function checkDatabaseImages() {
  console.log('🔍 Checking database for images...')
  
  try {
    const questionsWithImages = await prisma.question.findMany({
      where: {
        imageUrl: { not: null }
      },
      select: {
        id: true,
        question: true,
        imageUrl: true,
        imageAlt: true,
        chartData: true,
        moduleType: true
      },
      take: 10
    })
    
    console.log(`Found ${questionsWithImages.length} questions with images:`)
    
    questionsWithImages.forEach((q, i) => {
      console.log(`\n${i + 1}. Question ID: ${q.id}`)
      console.log(`   Question: ${q.question.substring(0, 80)}...`)
      console.log(`   Image URL: ${q.imageUrl}`)
      console.log(`   Image Alt: ${q.imageAlt?.substring(0, 60)}...`)
      console.log(`   Chart Data: ${q.chartData ? 'Yes' : 'No'}`)
    })
    
    const totalQuestions = await prisma.question.count()
    const questionsWithImagesCount = await prisma.question.count({
      where: { imageUrl: { not: null } }
    })
    
    console.log(`\n📊 Summary:`)
    console.log(`   Total questions: ${totalQuestions}`)
    console.log(`   Questions with images: ${questionsWithImagesCount}`)
    console.log(`   Questions without images: ${totalQuestions - questionsWithImagesCount}`)
    
  } catch (error) {
    console.error('❌ Failed to check database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabaseImages()
