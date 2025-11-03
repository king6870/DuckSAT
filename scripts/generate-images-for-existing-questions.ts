#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma'
import { imageGenerationService } from '../src/services/imageGenerationService'

async function generateImagesForExistingQuestions() {
  console.log('🎨 Generating images for existing questions...')
  
  try {
    // Find questions with chart descriptions but no images
    const questionsNeedingImages = await prisma.question.findMany({
      where: {
        AND: [
          { chartData: { not: undefined } },
          { imageUrl: null },
          { moduleType: 'math' }
        ]
      },
      take: 20 // Process 20 at a time
    })
    
    console.log(`Found ${questionsNeedingImages.length} questions needing images`)
    
    for (const question of questionsNeedingImages) {
      try {
        const chartData = question.chartData as any
        if (chartData?.description) {
          console.log(`Generating image for question ${question.id}...`)
          
          const chartConfig = {
            type: chartData.graphType || 'coordinate-plane',
            description: chartData.description,
            width: 600,
            height: 400
          }
          
          // Generate SVG (DALL-E is not working)
          const imageUrl = await imageGenerationService.generateSVGChart(chartConfig)
          
          if (imageUrl) {
            // Update question with image
            await prisma.question.update({
              where: { id: question.id },
              data: {
                imageUrl,
                imageAlt: chartData.description,
                chartData: {
                  ...chartData,
                  hasGeneratedImage: true
                }
              }
            })
            
            console.log(`✅ Generated image for question ${question.id}: ${imageUrl}`)
          }
        }
      } catch (error) {
        console.error(`Failed to generate image for question ${question.id}:`, error)
      }
    }
    
    console.log('✅ Image generation completed!')
    
  } catch (error) {
    console.error('❌ Failed to generate images:', error)
  } finally {
    await prisma.$disconnect()
  }
}

generateImagesForExistingQuestions()
