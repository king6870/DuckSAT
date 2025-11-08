/**
 * Migration Script: Move filesystem-based images to database
 * 
 * This script migrates existing images from the filesystem to the database
 * as blob storage. This is necessary for Vercel compatibility where the
 * filesystem is ephemeral.
 * 
 * Usage: npm run db:migrate-images
 */

import { PrismaClient } from '@prisma/client'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const prisma = new PrismaClient()

interface MigrationStats {
  total: number
  migrated: number
  skipped: number
  failed: number
  errors: string[]
}

async function migrateImagesToDatabase() {
  console.log('🚀 Starting image migration to database...\n')
  
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  }

  try {
    // Fetch all questions that have imageUrl but no imageData
    const questions = await prisma.question.findMany({
      where: {
        imageUrl: { not: null },
        imageData: null
      },
      select: {
        id: true,
        imageUrl: true,
        imageAlt: true
      }
    })

    stats.total = questions.length
    console.log(`📊 Found ${stats.total} questions with filesystem-based images\n`)

    for (const question of questions) {
      try {
        console.log(`Processing question ${question.id}...`)
        
        if (!question.imageUrl) {
          stats.skipped++
          continue
        }

        // Handle both old and new URL formats
        let filePath: string
        if (question.imageUrl.startsWith('/api/generated-images/')) {
          // Already using new format, skip
          console.log(`  ⏭️  Already using database format, skipping`)
          stats.skipped++
          continue
        } else if (question.imageUrl.startsWith('/generated-images/')) {
          // Old filesystem path
          const filename = question.imageUrl.replace('/generated-images/', '')
          filePath = join(process.cwd(), 'public', 'generated-images', filename)
        } else if (question.imageUrl.startsWith('/uploads/')) {
          // Uploaded diagram path
          const filename = question.imageUrl.replace('/uploads/', '')
          filePath = join(process.cwd(), 'public', 'uploads', filename)
        } else {
          console.log(`  ⚠️  Unknown URL format: ${question.imageUrl}`)
          stats.skipped++
          continue
        }

        // Check if file exists
        if (!existsSync(filePath)) {
          console.log(`  ⚠️  File not found: ${filePath}`)
          stats.failed++
          stats.errors.push(`Question ${question.id}: File not found - ${filePath}`)
          continue
        }

        // Read file
        const imageBuffer = await readFile(filePath)
        
        // Determine MIME type from file extension
        let mimeType = 'image/svg+xml'
        if (filePath.endsWith('.png')) {
          mimeType = 'image/png'
        } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
          mimeType = 'image/jpeg'
        }

        // Update question with image data
        await prisma.question.update({
          where: { id: question.id },
          data: {
            imageData: imageBuffer,
            imageMimeType: mimeType,
            imageUrl: `/api/generated-images/${question.id}` // Update to new API route
          }
        })

        console.log(`  ✅ Migrated successfully (${(imageBuffer.length / 1024).toFixed(2)} KB)`)
        stats.migrated++

      } catch (error) {
        console.error(`  ❌ Failed to migrate question ${question.id}:`, error)
        stats.failed++
        stats.errors.push(`Question ${question.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(70))
    console.log('📊 Migration Summary')
    console.log('='.repeat(70))
    console.log(`Total questions processed: ${stats.total}`)
    console.log(`✅ Successfully migrated: ${stats.migrated}`)
    console.log(`⏭️  Skipped (already migrated): ${stats.skipped}`)
    console.log(`❌ Failed: ${stats.failed}`)
    
    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:')
      stats.errors.forEach(error => console.log(`  - ${error}`))
    }

    console.log('\n✨ Migration complete!\n')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateImagesToDatabase()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
