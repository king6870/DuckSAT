/**
 * Question Image Service
 * 
 * Handles image generation and storage for questions.
 * Generates images after question is created so we have a question ID
 * for database storage.
 */

import { prisma } from '@/lib/prisma'
import { imageGenerationService, ChartConfig } from './imageGenerationService'

export interface QuestionImageData {
  chartType?: string
  chartDescription?: string
  graphType?: string
  width?: number
  height?: number
}

export class QuestionImageService {
  /**
   * Generate and store image for a question that already exists in database
   */
  async generateAndStoreImage(
    questionId: string,
    imageData: QuestionImageData
  ): Promise<string | null> {
    try {
      console.log(`🎨 Generating image for question ${questionId}...`)

      const chartConfig: ChartConfig = {
        type: (imageData.graphType as 'coordinate-plane' | 'bar-chart' | 'scatter-plot' | 'box-plot' | 'geometric-diagram' | 'function-graph') || 'coordinate-plane',
        description: imageData.chartDescription || 'Math diagram',
        width: imageData.width || 600,
        height: imageData.height || 400,
        questionId: questionId, // Important: provide question ID for DB storage
      }

      // Try DALL-E first (if API key is available)
      let imageUrl = await imageGenerationService.generateChartImage(chartConfig)

      // Fallback to SVG generation
      if (!imageUrl) {
        console.log('📊 DALL-E unavailable or failed, generating SVG...')
        imageUrl = await imageGenerationService.generateSVGChart(chartConfig)
      }

      if (imageUrl) {
        console.log(`✅ Image generated and stored for question ${questionId}`)
        return imageUrl
      }

      console.warn(`⚠️ Failed to generate image for question ${questionId}`)
      return null
    } catch (error) {
      console.error(`❌ Error generating image for question ${questionId}:`, error)
      return null
    }
  }

  /**
   * Generate images for multiple questions in batch
   */
  async generateImagesForQuestions(
    questions: Array<{ id: string; imageData: QuestionImageData }>
  ): Promise<{ [questionId: string]: string | null }> {
    const results: { [questionId: string]: string | null } = {}

    for (const question of questions) {
      const imageUrl = await this.generateAndStoreImage(
        question.id,
        question.imageData
      )
      results[question.id] = imageUrl
    }

    return results
  }

  /**
   * Migrate a single question's image from filesystem to database
   */
  async migrateQuestionImage(questionId: string): Promise<boolean> {
    try {
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        select: { imageUrl: true, imageData: true },
      })

      if (!question) {
        console.error(`Question ${questionId} not found`)
        return false
      }

      if (question.imageData) {
        console.log(`Question ${questionId} already has image data in DB`)
        return true
      }

      if (!question.imageUrl) {
        console.log(`Question ${questionId} has no image`)
        return true
      }

      if (question.imageUrl.startsWith('/api/generated-images/')) {
        console.log(`Question ${questionId} already uses new image API`)
        return true
      }

      // For now, just log that migration is needed
      // The actual migration will be done by the migrate-images-to-db.ts script
      console.log(`Question ${questionId} needs image migration`)
      return true
    } catch (error) {
      console.error(`Error checking migration for question ${questionId}:`, error)
      return false
    }
  }
}

export const questionImageService = new QuestionImageService()
